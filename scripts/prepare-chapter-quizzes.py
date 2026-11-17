"""Generate the shared chapter metadata from the actual book manifest."""
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'web/public/book/manifest.json').read_text(encoding='utf8'))
authored = json.loads((ROOT / 'content/learning/chapter-quizzes.json').read_text(encoding='utf8'))
chapters = []
for slug, rows in authored.items():
    pages = [p for p in manifest['pages'] if p['id'].startswith(slug + '/')]
    assert pages, slug
    body = [p for p in pages if p['id'].split('/')[-1] not in ('index', 'summary', 'exercises')]
    questions = []
    for index, row in enumerate(rows):
        if isinstance(row, list):
            prompt, options, answer, explanation = row
            row = dict(type='single', prompt=prompt, options=options, answer=answer, explanation=explanation)
        question = { 'id': f'{slug}:{index+1}', 'options': [], 'accepted': [], **row }
        kind, options, answer = question['type'], question['options'], question['answer']
        assert question['prompt'] and question['explanation'], slug
        assert kind in ('single', 'judge', 'multiple', 'fill', 'order'), slug
        if kind in ('single', 'judge'):
            assert len(options) >= 2 and type(answer) is int and 0 <= answer < len(options), slug
            if kind == 'judge': assert options == ['正确', '错误']
        elif kind in ('multiple', 'order'):
            assert len(options) >= 3 and isinstance(answer, list) and len(answer) == len(set(answer))
            assert all(type(a) is int and 0 <= a < len(options) for a in answer)
            if kind == 'multiple': assert 1 < len(answer) < len(options), slug
            else: assert sorted(answer) == list(range(len(options))), slug
        else:
            assert isinstance(answer, str) and answer.strip() and not options
            assert all(isinstance(a, str) and a.strip() for a in question['accepted'])
        questions.append(question)
    assert len({q['type'] for q in questions}) >= 3, slug
    chapters.append(dict(id=slug, title=pages[0]['group'], intro=body[0]['id'],
                         review=body[0]['id'], target=body[min(1, len(body)-1)]['id'],
                         end=pages[-1]['id'], questions=questions))
target = ROOT / 'web/.vitepress/theme/chapter-learning.json'
text = json.dumps(chapters, ensure_ascii=False, indent=2)+'\n'
if '--check' in sys.argv:
    assert target.read_text(encoding='utf8') == text, 'Stale chapter quiz metadata; run npm run build:learning'
else:
    target.write_text(text, encoding='utf8')
print(f'{len(chapters)} chapters; {sum(len(c["questions"]) for c in chapters)} questions')
