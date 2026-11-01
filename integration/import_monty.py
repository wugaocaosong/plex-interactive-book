"""Idempotent, owner-checked import into the current PLEX question bank.

Run with the PLEX backend Python environment. Dry run is the default.
No schema change or replacement of existing course questions.
"""
import argparse
import json
import runpy
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def definitions():
    exercises = json.loads((ROOT / 'web/public/learning/exercises.json').read_text(encoding='utf-8'))
    concepts = [('lang-var', 'lang-basics'), ('branch-nested', 'branch'), ('loop-for', 'loop')]
    for exercise, (concept, domain) in zip([e for e in exercises if e['id'].startswith('monty-')], concepts):
        # PLEX's expression runner compares stdout. Compare return values inside
        # its controlled expression so numerically equal 1 and 1.0 stay equal,
        # matching the existing Pyodide exercise driver.
        tests = [{'invoke': 'solve(*' + repr(t['args']) + ') == ' + repr(t['expected']), 'expected': 'True', 'label': '返回值检查 ' + str(i + 1)}
                 for i, t in enumerate(exercise['tests'])]
        yield exercise['serverRef'], {
            'title_cn': exercise['title'], 'description_cn': exercise['description'] + '\n经典三门规则：奖品等概率；主持人知道奖品、始终打开未选的空门、始终允许换门。',
            'input_format_cn': '实现 solve 函数；参数由服务器逐例传入。门编号为 0、1、2。',
            'output_format_cn': '返回题目约定的 Python 值，不通过 input/print 判题。',
            'samples_json': [{'input': repr(exercise['tests'][0]['args']), 'output': repr(exercise['tests'][0]['expected'])}],
            'question_type': 'coding', 'source_kind': 'plex_ebook',
            'source_ref': 'plex-interactive-book:monty:v1:' + exercise['id'],
            'kg_node_id': concept, 'domain_key': domain, 'difficulty': 1, 'level': 1, 'star_difficulty': 1,
            'starter_code': exercise['starter'], 'reference_answer': exercise['solution'],
            'hint': '\n'.join(exercise['hints']), 'run_mode': 'expression', 'test_cases_json': tests,
            'is_active': True, 'needs_review': False,
        }


def import_questions(apply=False):
    from app.models import db, Problem
    from sqlalchemy import func, text
    report = []
    for ref, values in definitions():
        assert len(ref) <= 8, 'Match the deployed MySQL problem_no width'
        if not db.session.execute(text('SELECT id FROM knowledge_nodes WHERE id=:id'), {'id': values['kg_node_id']}).first():
            raise RuntimeError('PLEX 知识节点尚未初始化：' + values['kg_node_id'])
        row = Problem.query.filter_by(problem_no=ref).one_or_none()
        if row and (row.source_kind != 'plex_ebook' or row.source_ref != values['source_ref']):
            raise RuntimeError('编号已由其他来源占用，未覆盖：' + ref)
        changed = not row or any(getattr(row, k) != v for k, v in values.items())
        if not row:
            row = Problem(id=(db.session.query(func.max(Problem.id)).scalar() or 0) + 1, problem_no=ref)
            db.session.add(row)
        if changed:
            for k, v in values.items():
                setattr(row, k, v)
            db.session.flush()
        report.append({'ref': ref, 'canonical_ref': f'bank-{row.id}', 'changed': changed, 'source_ref': values['source_ref'], 'tests': len(values['test_cases_json'])})
    if apply:
        db.session.commit()
    else:
        db.session.rollback()
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plex-root', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    backend = args.plex_root.resolve() / 'backend'
    if not (backend / 'app/services/tutor_context.py').exists():
        parser.error('请选择具备当前 tutor/context 接口的 PLEX 主工程')
    sys.path.insert(0, str(backend))
    # Use only the existing model connection. The app factory performs unrelated
    # development bootstrap/migrations, which do not belong in a question import.
    from flask import Flask
    from app.config import DevelopmentConfig
    from app.models import db
    app = Flask('plex-ebook-import')
    app.config.from_object(DevelopmentConfig)
    if app.config['SQLALCHEMY_DATABASE_URI'].startswith('sqlite'):
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {}
    db.init_app(app)
    with app.app_context():
        report = import_questions(args.apply)
    print(json.dumps({'applied': args.apply, 'questions': report}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
