"""Verify against a current PLEX checkout using an isolated temporary SQLite DB.
--real-model explicitly enables real configured model calls using synthetic data.
--serve runs a disposable HTTP backend on 5103 for browser contract verification.
"""
import argparse
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
import uuid

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plex-root', type=Path, required=True)
    parser.add_argument('--real-model', action='store_true')
    parser.add_argument('--real-execution', action='store_true')
    parser.add_argument('--serve', action='store_true')
    args = parser.parse_args()
    sys.path.insert(0, str(args.plex_root.resolve() / 'backend'))
    from app import create_app
    from app.config import TestingConfig
    from app.models import db, User, Problem
    from app.models.problem_bank import KnowledgeNode
    from werkzeug.security import generate_password_hash
    from import_monty import import_questions, definitions
    from unittest.mock import patch
    with tempfile.TemporaryDirectory(prefix='plex-monty-verification-', ignore_cleanup_errors=True) as tmp:
        TestingConfig.SQLALCHEMY_DATABASE_URI = 'sqlite:///' + str(Path(tmp) / 'test.db')
        TestingConfig.SQLALCHEMY_ECHO = False
        app = create_app('testing')
        app.config.update(TUTOR_MODELS_ENABLED=args.real_model, LLM_ALLOW_IN_TESTS=args.real_model,
                          CODE_EXECUTION_BACKEND='docker' if args.real_execution else 'disabled',
                          AUTH_RATE_LIMIT_ENABLED=False)
        password = secrets.token_urlsafe(18)
        with app.app_context():
            for ref, spec in definitions():
                if not db.session.get(KnowledgeNode, spec['kg_node_id']):
                    db.session.add(KnowledgeNode(id=spec['kg_node_id'], domain_key=spec['domain_key'], domain_title=spec['domain_key'], title=spec['title_cn']))
            user = User.query.filter_by(username='student001').one()
            user.password_hash = generate_password_hash(password)
            db.session.commit()
            assert len(import_questions(False)) == 3
            assert Problem.query.filter_by(source_kind='plex_ebook').count() == 0
            first = import_questions(True)
            assert all(r['changed'] for r in first)
            assert not any(r['changed'] for r in import_questions(True))
        if args.serve:
            # Test credentials are random, local-only and never written to source/ZIP.
            credentials = ROOT / 'output/plex-test-session.json'
            credentials.parent.mkdir(exist_ok=True)
            credentials.write_text(json.dumps({'username':'student001','password':password}), encoding='utf-8')
            print('Disposable PLEX test backend: http://127.0.0.1:5103', flush=True)
            app.run(host='127.0.0.1', port=5103, threaded=True, use_reloader=False)
            return
        client = app.test_client()
        def post(path, body, auth=None):
            return client.post('/api/v1'+path, json=body, headers=auth or {})
        session = post('/auth/login', {'username':'student001','password':password}).json['data']
        auth = {'Authorization':'Bearer '+session['access_token']}
        assert client.get('/api/v1/student/profile', headers=auth).status_code == 200
        refresh = post('/auth/refresh', {}, {'Authorization':'Bearer '+session['refresh_token']})
        assert refresh.status_code == 200
        report = {'plexCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=args.plex_root,text=True).strip(),
                  'database':'isolated temporary SQLite', 'import':first, 'authProfileRefresh':True,
                  'execution':'docker' if args.real_execution else 'mocked contract only', 'submissions':[], 'model':{'requested':args.real_model}}
        for ref, definition in definitions():
            context = post('/student/tutor/context', {'question_ref':ref}, auth).json['data']
            assert context['task_source'] == 'server'
            task = context['task']
            rid = str(uuid.uuid4())
            body = {'request_id':rid,'question_version':task['version'],'code':definition['reference_answer']}
            if args.real_execution:
                response = post('/student/practice-submissions/'+ref, body, auth)
            else:
                with patch('app.services.code_execution.CodeExecutionService.submit', return_value={'all_passed':True,'total':len(definition['test_cases_json']),'passed_count':len(definition['test_cases_json']),'backend':'contract_mock','results':[]}):
                    response = post('/student/practice-submissions/'+ref, body, auth)
            assert response.status_code == 200, response.json
            result = response.json['data']
            assert result['result']['all_passed'], result
            assert post('/student/practice-submissions/'+ref,body,auth).json['data']['id'] == rid
            assert post('/student/practice-submissions/'+ref,{**body,'code':'wrong'},auth).status_code == 409
            assert post('/student/tutor/context',{'question_ref':ref,'question_version':'stale'},auth).status_code == 409
            with app.app_context():
                row = Problem.query.filter_by(problem_no=ref).one()
                row.description_cn += '\n版本变化测试'
                db.session.commit()
            assert post('/student/practice-submissions/'+ref,{**body,'request_id':str(uuid.uuid4())},auth).status_code == 409
            if args.real_execution:
                # Fetch current version, execute a typical incorrect starter too.
                task = post('/student/tutor/context',{'question_ref':ref},auth).json['data']['task']
                bad=post('/student/practice-submissions/'+ref,{'request_id':str(uuid.uuid4()),'question_version':task['version'],'code':definition['starter_code']},auth)
                assert bad.status_code==200 and not bad.json['data']['result']['all_passed'], bad.json
            report['submissions'].append({'ref':ref,'referencePassed':True,'wrongStarterRejected':args.real_execution,'duplicateIdempotent':True,'staleVersionRejected':True})
        context=post('/student/tutor/context',{'question_ref':'MH030002'},auth).json['data']['task']
        request_id=str(uuid.uuid4())
        question={'request_id':request_id,'question_ref':'MH030002','question_version':context['version'],'mode':'next_step','hint_level':1,'question':'我用 or 排除初选门和核心门，但结果还是含有核心门。请只提示下一步怎么检查。','code':'def solve(prize, first):\n    return [d for d in range(3) if d != first or d != prize]'}
        response=post('/student/tutor/ask',question,auth)
        assert response.status_code==200, response.json
        tutor=response.json['data']
        report['model'].update(status=tutor['status'],generation_mode=tutor['generation_mode'],policy=tutor['policy_result'],summary=tutor['summary'],next_step=tutor['next_step'])
        assert client.get('/api/v1/student/tutor/turns/'+request_id,headers=auth).status_code==200
        assert post('/student/tutor/turns/'+request_id+'/cancel',{},auth).status_code==200
        # Force provider failure and verify that the API never labels it as a model response.
        with patch('app.services.tutoring.get_llm_provider') as provider:
            provider.return_value.available.return_value=True
            provider.return_value.generate_json.side_effect=RuntimeError('synthetic provider failure')
            failure=post('/student/tutor/ask',{**question,'request_id':str(uuid.uuid4())},auth)
            assert failure.status_code==200 and failure.json['data']['generation_mode']!='llm_reviewed'
        report['failedModelNotImpersonated']=True
        assert post('/auth/logout',{'refresh_token':session['refresh_token']},auth).status_code==200
        assert client.get('/api/v1/student/profile',headers=auth).status_code==401
        assert post('/auth/refresh',{}, {'Authorization':'Bearer '+session['refresh_token']}).status_code==401
        report['logoutRevokesRefresh']=True
        output=ROOT/'output'/('plex-real-integration.json' if args.real_model or args.real_execution else 'plex-contract-integration.json')
        output.parent.mkdir(exist_ok=True)
        output.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(report,ensure_ascii=False,indent=2))
        with app.app_context():
            db.session.remove();db.engine.dispose()


if __name__=='__main__':
    main()
