"""Fail the build on missing pages, source references, images or internal links."""
import hashlib,json,pathlib,re,urllib.parse
from bs4 import BeautifulSoup
ROOT=pathlib.Path(__file__).resolve().parents[1]
PUBLIC=ROOT/'web/public'
manifest=json.loads((PUBLIC/'book/manifest.json').read_text(encoding='utf8'))
routes={p['route'] for p in manifest['pages']}
documents={p['route']:BeautifulSoup(json.loads((PUBLIC/'book/pages'/f"{p['id']}.json").read_text(encoding='utf8'))['html'],'html.parser') for p in manifest['pages']}
errors=[];count=0;code=0;images=0;frames=0
def fail(message):errors.append(message)
for page in manifest['pages']:
    path=PUBLIC/'book/pages'/f"{page['id']}.json"
    if not path.exists():fail(f'Missing page {page["id"]}');continue
    data=json.loads(path.read_text(encoding='utf8'));soup=BeautifulSoup(data['html'],'html.parser')
    if page['sourcePath']:
        count+=1
        original=ROOT/'content/upstream/hello-algo/docs'/page['sourcePath']
        if not original.exists():fail(f'Missing source {page["sourcePath"]}')
        elif data.get('conversion',{}).get('sourceSha256')!=hashlib.sha256(original.read_bytes()).hexdigest():fail(f'Source checksum mismatch {page["id"]}')
    if '[file]{' in data['html'] or '```src' in data['html']:fail(f'Unresolved source marker {page["id"]}')
    for image in soup.find_all('img',src=True):
        images+=1
        if image['src'].startswith('/') and not (PUBLIC/image['src'][1:]).exists():fail(f'Missing image {image["src"]}')
        if image['src'].startswith('http'):fail(f'External image {image["src"]}')
    for a in soup.find_all('a',href=True):
        href=a['href'].split('#')[0]
        if href.startswith('/read/') and href not in routes:fail(f'Broken book link {page["id"]}: {href}')
        if '#' in a['href'] and (a['href'].startswith('#') or href in routes):
            fragment=urllib.parse.unquote(a['href'].split('#',1)[1]);target=documents[href or page['route']]
            if fragment and not target.find(id=fragment) and not target.find(attrs={'data-block':fragment}):fail(f'Broken anchor {page["id"]}: {a["href"]}')
    for pre in soup.find_all('pre'):
        if not pre.get_text(strip=True):fail(f'Empty code block {page["id"]}')
    for example in data['codeExamples']:
        code+=1
        if not example['variants']:fail(f'Empty code {example["id"]}')
        for variant in example['variants']:
            source=ROOT/'content/upstream/hello-algo'/variant['sourcePath']
            if not source.exists():fail(f'Missing code source {source}')
            elif source.read_text(encoding='utf8')!=variant['fullSource']:fail(f'Code differs from upstream {source}')
            if not variant['snippet'].strip():fail(f'Empty snippet {example["id"]}')
            if variant['extraction'] not in {'symbol','file','file-implementation'}:fail(f'Unresolved extraction {example["id"]}')
            if variant['snippet'] not in variant['fullSource']:fail(f'Untraceable snippet {example["id"]}')
    for animation in data['animations']:
        frames+=len(animation)
        for frame in animation:
            if not (PUBLIC/frame['src'][1:]).exists():fail(f'Missing animation frame {frame["src"]}')
if count!=118:fail(f'Expected 118 upstream pages, got {count}')
if len(routes)!=len(manifest['pages']):fail('Duplicate routes')
if errors:
    print('\n'.join(errors));raise SystemExit(1)
print(f'Content audit passed: {count} upstream pages; {len(routes)} book sections; {code} code references; {images} images; {frames} animation frames.')
