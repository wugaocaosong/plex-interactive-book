"""Authored teammate labs; never mutate the Hello Algo source snapshot."""
import ast
import json
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content/learning/route-lab'
SLUGS = ['index', 'graph', 'traversal', 'sort-search', 'dispatch', 'report']

def reference():
    return (CONTENT / 'route_planner.py').read_text(encoding='utf8')

def example(identity, code, path, legacy=None):
    item = dict(id=identity, file=path.split('/')[-1], className='', functionName='',
                variants=[dict(language='python', snippet=code, fullSource=code,
                    sourcePath=path, sourceUrl='', extraction='file', runnable=True, sourceOrigin='authored')])
    if legacy:
        item['legacyDraftKey'] = 'draft:lab-editor:' + legacy
        item['labKey'] = legacy
    return item

def pages():
    full = reference()
    tree = ast.parse(full)
    helpers = '\n\n'.join(ast.get_source_segment(full, node) for node in tree.body
        if isinstance(node, ast.FunctionDef) and node.name in ['build_adj_list', 'bfs_shortest'])
    for slug in SLUGS:
        original = json.loads((CONTENT / (slug + '.json')).read_text(encoding='utf8'))
        soup = BeautifulSoup(original['html'], 'html.parser')
        examples = [example('example-lab-' + slug + '-00', full, 'learning/route-lab/route_planner.py')]
        for card in soup.select('.lab-editor'):
            key = card['data-lab-key']
            code = card.select_one('textarea').get_text()
            # Each run has a fresh namespace, so the dispatch card needs its dependencies.
            if slug == 'dispatch' and 'def build_adj_list' not in code:
                code = helpers + '\n\n' + code
                if code.rstrip().endswith('dispatch_plan()'):
                    code = code.rstrip()[:-len('dispatch_plan()')] + 'print(dispatch_plan())\n'
            title = card.select_one('.lab-editor-title').get_text().replace('🛠 ', '')
            card.clear()
            card['class'] = ['route-lab-card']
            heading = soup.new_tag('h3'); heading.string = title; card.append(heading)
            p = soup.new_tag('p'); p.string = '修改代码，运行后对照输出。运行成功不代表已通过知识测验。'; card.append(p)
            preview = soup.new_tag('pre', attrs={'tabindex':'0','aria-label':'起始代码预览，完整代码可在实验台编辑'}); preview.string = '\n'.join(code.splitlines()[:4]) + '\n…'; card.append(preview)
            button = soup.new_tag('button', attrs={'type':'button','data-action':'code','data-code':str(len(examples))})
            button.string = '动手写代码'; card.append(button)
            status = soup.new_tag('p', attrs={'class':'route-lab-result','data-lab-result':key,'role':'status'})
            status.string = '尚未运行'; card.append(status)
            examples.append(example('example-' + key, code, 'learning/route-lab/' + key + '.py', key))
        # Stable explicit block IDs survive the first migration and subsequent imports.
        for tag in soup.select('[data-block]'):
            tag['data-preserve-block'] = tag['data-block']
        yield original, str(soup), examples

def seed_registry(original, registry):
    if original['id'] not in registry:
        soup = BeautifulSoup(original['html'], 'html.parser')
        aliases = dict(original['blockAliases'])
        aliases.update({tag['data-block']:tag['data-block'] for tag in soup.select('[data-block]')})
        registry[original['id']] = {'blocks':[], 'aliases':aliases}

def publish_sources(pages_data, public):
    files = {}
    for _, _, examples in pages_data:
        for item in examples:
            variant = item['variants'][0]
            path = public / variant['sourcePath']
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(variant['fullSource'], encoding='utf8', newline='\n')
            files[variant['sourcePath']] = variant['fullSource']
    return files
