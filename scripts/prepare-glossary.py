"""Publish one authored glossary and verify every explicit term in the book."""
import html
import json
import re
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
entries = json.loads((ROOT/'content/learning/glossary-authored.json').read_text(encoding='utf8'))
lookup = {entry['term']: entry for entry in entries}
assert len(lookup) == len(entries), 'Duplicate glossary names'
def name(label):
    label = html.unescape(re.sub(r'<[^>]*>', '', label))
    label = re.sub(r'\\[()\[\]]', '', label)
    return re.sub(r'\s+', ' ', label.split('（')[0]).strip()
count = 0
for path in (ROOT/'web/public/book/pages').rglob('*.json'):
    page = json.loads(path.read_text(encoding='utf8'))
    source = page.get('html', '')
    labels = re.findall(r'<u\b[^>]*>(.*?)</u>', source, re.S)
    labels += re.findall(r'<span\b[^>]*class="[^"]*ch12-term[^"]*"[^>]*data-term="([^"]+)"', source)
    for label in labels:
        term = name(label)
        assert term in lookup and lookup[term]['definition'].strip(), f'Missing definition: {page["id"]}: {term}'
        count += 1
target = ROOT/'web/public/learning/glossary.json'
text = json.dumps(entries, ensure_ascii=False, indent=2)+'\n'
if '--check' in sys.argv:
    assert target.read_text(encoding='utf8') == text, 'Stale glossary; run python scripts/prepare-glossary.py'
else:
    target.write_text(text, encoding='utf8')
print(f'Published {len(entries)} definitions; all {count} explicit term labels have explanations.')
