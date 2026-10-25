"""Publish authored learning assets and verify reference solutions."""
import copy,json,pathlib,runpy,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
def publish(path,value):
    text=json.dumps(value,ensure_ascii=False,indent=2)+'\n'
    if '--check' in sys.argv:
        assert path.read_text(encoding='utf8')==text,f'Stale learning asset: {path}. Run npm run build:learning.'
    else:
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(text,encoding='utf8',newline='\n')
data=runpy.run_path(str(ROOT/'content/learning/exercises.py'))['EXERCISES']
unit=runpy.run_path(str(ROOT/'content/learning/monty.py'))
data+=unit['EXERCISES']
manifest=json.loads((ROOT/'web/public/book/manifest.json').read_text(encoding='utf8'))
sections={p['id'] for p in manifest['pages']}
assert len(data)==27 and len({e['id'] for e in data})==27
for exercise in data:
    assert exercise['sectionId'] in sections,exercise['sectionId']
    for test in exercise['tests']:
        scope={};exec(exercise['solution'],scope)
        assert scope['solve'](*copy.deepcopy(test['args']))==test['expected'],exercise['id']
target=ROOT/'web/public/learning/exercises.json';target.parent.mkdir(parents=True,exist_ok=True)
publish(target,data)
publish(target.parent/'monty-unit.json',{'id':'monty-hall','version':'1','minutes':45,
    'title':'三扇舱门：直觉可靠吗？','goals':['解释主持人规则','区分概率与频率','读懂并修改模拟代码'],
    'pages':[{'id':'unit/monty/'+slug,'title':title,'mode':mode} for slug,title,mode,_ in unit['PAGES']],
    'exercises':[{'id':e['id'],'serverRef':e['serverRef']} for e in unit['EXERCISES']],
    'activityId':'monty-hall','requiredQuizQuestion':0,'minimumScore':3})
print(f'Published {len(data)} exercises; {sum(len(e["tests"]) for e in data)} reference cases passed.')
definitions=dict(line.split('\t',1) for line in (ROOT/'content/learning/glossary.tsv').read_text(encoding='utf8').splitlines() if line)
terms=[]
for line in (ROOT/'content/upstream/hello-algo/docs/chapter_appendix/terminology.md').read_text(encoding='utf8').splitlines():
    if not line.startswith('|') or '---' in line or 'English' in line:continue
    english,chinese=[part.strip() for part in line.split('|')[1:3]]
    assert chinese in definitions,f'Missing definition: {chinese}'
    terms.append((english,chinese))
search=json.loads((ROOT/'web/public/book/search.json').read_text(encoding='utf8'))
glossary=[]
for english,chinese in terms:
    candidates=[entry for entry in search if entry['id'].startswith('chapter_') and 'appendix' not in entry['id'] and 'reference' not in entry['id'] and chinese.replace('$','') in entry['text'].replace('$','')]
    candidates.sort(key=lambda entry:(chinese not in entry['title'],len(entry['text'])))
    section=candidates[0]['id'] if candidates else 'chapter_appendix/terminology'
    glossary.append(dict(term=chinese.replace('$',''),english=english.replace('$',''),definition=definitions[chinese],sectionId=section))
publish(target.parent/'glossary.json',glossary)
print(f'Published {len(glossary)} authored glossary explanations.')
