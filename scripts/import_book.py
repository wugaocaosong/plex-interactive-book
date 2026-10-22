"""Deterministic Hello Algo -> PLEX import. Original snapshots are never modified."""
from __future__ import annotations
import ast, hashlib, html, json, pathlib, re, shutil
import markdown, yaml
from bs4 import BeautifulSoup

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content/upstream/hello-algo'
PUBLIC = ROOT / 'web/public'
SHA = '350f483801b2badb95180047aa82cadb825852a2'
LANGUAGES = ['python','java','cpp','c','csharp','go','javascript','typescript','swift','rust','kotlin','dart','ruby','zig']
SUFFIXES = {'.py','.java','.cpp','.c','.h','.cs','.go','.js','.ts','.swift','.rs','.kt','.dart','.rb','.zig'}

def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf8', newline='\n')

def normalize(name):
    return re.sub(r'[^a-z0-9]', '', name.lower())

def flatten_nav(items, group=''):
    result = []
    for item in items:
        if isinstance(item, str):
            result.append((item, '', group))
        else:
            for label, value in item.items():
                label = html.unescape(label).replace('\xa0',' ').strip()
                if isinstance(value,list): result.extend(flatten_nav(value,label))
                else: result.append((value,label,group))
    return result

def extract_python(text, cls, func):
    tree = ast.parse(text)
    scope = tree
    if cls:
        scope = next((n for n in ast.walk(tree) if isinstance(n,ast.ClassDef) and normalize(n.name)==normalize(cls)), None)
        if scope is None: raise ValueError(f'Python class not found: {cls}')
    if func:
        target = next((n for n in ast.walk(scope) if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef)) and normalize(n.name)==normalize(func)),None)
    else: target = scope
    if target and hasattr(target,'lineno'):
        lines=text.splitlines()
        first=min([target.lineno]+[n.lineno for n in getattr(target,'decorator_list',[])])-1
        return '\n'.join(lines[first:target.end_lineno]), 'symbol'
    if not cls and not func: return text,'file'
    raise ValueError(f'Python symbol not found: {cls}.{func}')

def extract_braced(text, cls, func, language=''):
    """Mask strings/comments before balancing braces; never truncate on braces in literals."""
    wanted = func or cls
    if not wanted: return text,'file'
    masked = re.sub(r'//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|`(?:\\.|[^`\\])*`',
                    lambda m: re.sub(r'[^\n]',' ',m.group()),text)
    # Methods with the same name in different classes must keep their class scope.
    if cls and func and language not in {'c','go'}:
        scopes=[]
        for declaration in re.finditer(r'\b(class|struct|impl|const|fn)\s+([A-Za-z_]\w*)',masked):
            if normalize(declaration[2])!=normalize(cls): continue
            opening=masked.find('{',declaration.end())
            if opening<0 or ';' in masked[declaration.end():opening]: continue
            if language=='rust' and declaration[1]!='impl': continue
            depth=1; end=opening+1
            while end<len(masked) and depth:
                depth+=(masked[end]=='{')-(masked[end]=='}');end+=1
            scopes.append((opening+1,end-1))
        if not scopes: raise ValueError(f'{language} class not found: {cls}')
        first,last=scopes[0];text=text[first:last];masked=masked[first:last]
    for match in re.finditer(r'\b([A-Za-z_]\w*)\s*(?=\(|[<{:=])',masked):
        if normalize(match[1])!=normalize(wanted): continue
        start=masked.rfind('\n',0,match.start())+1
        if language=='go' and cls and func:
            receiver=re.search(r'func\s*\(\w+\s+\*?(\w+)\)',masked[start:match.start()])
            if receiver and normalize(receiver[1])!=normalize(cls): continue
        opening=masked.find('{',match.end())
        if opening<0 or opening-match.end()>400: continue
        # Calls end with a semicolon before any definition body.
        if ';' in masked[match.end():opening]: continue
        depth=1; end=opening+1
        while end<len(masked) and depth:
            depth += (masked[end]=='{')-(masked[end]=='}'); end+=1
        if depth==0: return text[start:end], 'symbol'
    raise ValueError(f'{language} symbol not found: {cls}.{func}')

def extract_ruby(text, cls, func):
    def find(scope, kind, name):
        lines=scope.splitlines()
        for i,line in enumerate(lines):
            match=re.match(r'^(\s*)'+kind+r'\s+(?:self\.)?(\w+)',line)
            if match and normalize(match[2])==normalize(name):
                ending=next((j for j in range(i+1,len(lines)) if re.match(r'^'+re.escape(match[1])+r'end\b',lines[j])),None)
                if ending is not None:return '\n'.join(lines[i:ending+1])
        raise ValueError(f'Ruby symbol not found: {kind} {name}')
    scope=find(text,'class',cls) if cls else text
    if func:return find(scope,'def','initialize' if func=='__init__' else func),'symbol'
    return scope,'symbol' if cls else 'file'

def extract_variant(text, cls, func, language, file_name):
    if language=='python':return extract_python(text,cls,func)
    if language=='ruby':return extract_ruby(text,cls,func)
    # Procedural implementations split a logical class across a type and free functions.
    if cls and not func and language in {'c','go','rust'}:
        if not any(normalize(name)==normalize(cls) for name in re.findall(r'\b\w+\b',text)):
            raise ValueError(f'{language} implementation not found: {cls}')
        return text,'file-implementation'
    target=func
    if func=='__init__':
        target={'java':cls,'cpp':cls,'csharp':cls,'dart':cls,'javascript':'constructor','typescript':'constructor','c':'newMaxHeap','go':'newMaxHeap','rust':'new','swift':'init','kotlin':'init','zig':'init'}[language]
    if language=='c' and func=='remove':target='removeItem'
    if language in {'c','swift','kotlin'} and file_name=='quick_sort':
        if cls=='quick_sort_median' and func=='partition':target='partitionMedian'
        if func=='quick_sort' and cls in {'quick_sort_median','quick_sort_tail_call'}:target=cls
        cls=''
    if language=='go':
        if file_name=='linked_list':target={'insert':'insertNode','remove':'removeItem','find':'findNode'}.get(func,func)
        if file_name=='space_complexity' and func!='build_tree':target='space_'+func
        if file_name.startswith('preorder_traversal_'):
            suffix={'preorder_traversal_i_compact':'I','preorder_traversal_ii_compact':'II','preorder_traversal_iii_compact':'III','preorder_traversal_iii_template':'III'}[file_name]
            target=func+suffix
    return extract_braced(text,cls,target,language)

def code_variants(file_name, cls, func, chapter):
    variants=[]
    for language in LANGUAGES:
        candidates = [p for p in code_index[language] if normalize(p.stem)==normalize(file_name)]
        candidates.sort(key=lambda p:(chapter not in p.parts, len(p.parts), p.as_posix()))
        if not candidates: continue
        path=candidates[0]
        full=path.read_text(encoding='utf8')
        snippet, extraction = extract_variant(full,cls,func,language,file_name)
        relative=path.relative_to(SOURCE).as_posix()
        variants.append({'language':language,'snippet':snippet,'fullSource':full,'sourcePath':relative,
                         'sourceUrl':f'https://github.com/krahets/hello-algo/blob/{SHA}/{relative}',
                         'extraction':extraction,'runnable':language=='python'})
    if not variants: raise ValueError(f'Unresolved code reference: {chapter}/{file_name} {cls}.{func}')
    return variants

def convert(source, path, page_id):
    examples=[]
    source=re.sub(r'^---\n.*?\n---\n','',source,flags=re.S)
    def replace_code(match):
        descriptor=match[1].strip()
        found=re.search(r'\[file\]\{(.*?)\}-\[class\]\{(.*?)\}-\[func\]\{(.*?)\}',descriptor)
        if not found: raise ValueError(f'Unknown code marker in {path}: {descriptor}')
        name,cls,func=found.groups()
        variants=code_variants(name,cls,func,path.parts[0])
        index=len(examples)
        examples.append({'id':f'{page_id}-code-{index}','file':name,'className':cls,'functionName':func,'variants':variants})
        preview=variants[0]
        return '\n\n'+f'<div class="code-example" data-code="{index}"><div class="code-caption"><span>{html.escape(name)} · {preview["language"]}</span><button data-action="code" data-code="{index}">查看 / 运行</button></div><pre><code>{html.escape(preview["snippet"])}</code></pre></div>'+'\n\n'
    source=re.sub(r'```src\s*\n(.*?)\n\s*```',replace_code,source,flags=re.S)
    output=markdown.markdown(source,extensions=['extra','admonition','toc','pymdownx.details','pymdownx.highlight','pymdownx.superfences',
        'pymdownx.tabbed','pymdownx.arithmatex','pymdownx.mark','pymdownx.tilde','pymdownx.caret','pymdownx.keys'],
        # Optional system Pygments must not change generated HTML or fence parsing.
        extension_configs={'pymdownx.highlight':{'use_pygments':False},'pymdownx.tabbed':{'alternate_style':True},'pymdownx.arithmatex':{'generic':True}})
    soup=BeautifulSoup(output,'html.parser')
    for tag in soup.find_all(['script','iframe']): tag.decompose()
    for tag in soup.find_all(True):
        for key in list(tag.attrs):
            if key.startswith('on'): del tag[key]
    for image in soup.find_all('img'):
        url=image.get('src','')
        if not re.match(r'^(https?:|data:)',url):
            normalized=(SOURCE/'docs'/path.parent/url).resolve()
            if not normalized.is_relative_to((SOURCE/'docs').resolve()) or not normalized.exists():
                raise ValueError(f'Missing image: {path}: {url}')
            image['src']='/upstream/'+normalized.relative_to(SOURCE/'docs').as_posix()
        image['loading']='lazy'; image['decoding']='async'
        image['data-action']='image'
    for anchor in soup.find_all('a',href=True):
        url=anchor['href']
        if re.match(r'^(https?:|mailto:|#)',url): continue
        target,*fragment=url.split('#',1)
        resolved=(SOURCE/'docs'/path.parent/target).resolve()
        if resolved.is_dir(): resolved=resolved/'index.md'
        if resolved.suffix=='.md':
            rel=resolved.relative_to(SOURCE/'docs').as_posix()
            if rel in route_map: anchor['href']=route_map[rel]+(('#'+fragment[0]) if fragment else '')
            else: anchor['href']='https://www.hello-algo.com/'+rel.replace('index.md','').replace('.md','/')+(('#'+fragment[0]) if fragment else '')
        elif resolved.exists() and resolved.is_relative_to(SOURCE/'docs'):
            anchor['href']='/upstream/'+resolved.relative_to(SOURCE/'docs').as_posix()
    # Turn numeric MkDocs animation tabs into one real step player. Keep every frame.
    animations=[]
    for tabset in soup.select('.tabbed-set'):
        contents=tabset.select(':scope > .tabbed-content > .tabbed-block')
        if len(contents)>1 and all(c.find('img') for c in contents):
            frames=[{'src':c.find('img')['src'],'alt':c.find('img').get('alt','图解')} for c in contents]
            ai=len(animations); animations.append(frames)
            markup=f'<figure class="step-player" data-animation="{ai}"><img src="{frames[0]["src"]}" alt="{html.escape(frames[0]["alt"])}" data-action="image"/><figcaption><button data-action="step-prev" data-animation="{ai}" aria-label="上一帧">‹</button><span data-step-label>1 / {len(frames)}</span><button data-action="step-play" data-animation="{ai}">播放</button><button data-action="step-next" data-animation="{ai}" aria-label="下一帧">›</button></figcaption></figure>'
            tabset.replace_with(BeautifulSoup(markup,'html.parser'))
    # Textual tabs remain accessible as labelled sections, not inert radio controls.
    for tabset in soup.select('.tabbed-set'):
        labels=[label.get_text() for label in tabset.select('.tabbed-labels label')]
        sections=tabset.select('.tabbed-content > .tabbed-block')
        replacement=BeautifulSoup('<div class="source-tabs"></div>','html.parser').div
        for label,section in zip(labels,sections):
            heading=soup.new_tag('h4');heading.string=label;replacement.append(heading)
            for child in list(section.contents): replacement.append(child)
        tabset.replace_with(replacement)
    # Image and caption form a single pagination unit.
    for paragraph in list(soup.find_all('p')):
        image=paragraph.find('img',recursive=False)
        if image and not paragraph.get_text(strip=True):
            figure=soup.new_tag('figure');image.extract();figure.append(image)
            if image.get('alt'):
                caption=soup.new_tag('figcaption');caption.string=image['alt'];figure.append(caption)
            paragraph.replace_with(figure)
    for i,tag in enumerate(soup.find_all(recursive=False)):
        tag['data-block']=f'b{i}'
    return str(soup),examples,animations

def page_record(id,title,kind,group,source_path=None):
    return {'id':id,'title':title,'kind':kind,'group':group,'route':f'/read/{id}',
            'sourcePath':source_path,'sourceCommit':SHA if source_path else None}

def publish(record,body,examples=None,animations=None):
    conversion=None
    if record['sourcePath']:
        original=(SOURCE/'docs'/record['sourcePath']).read_bytes()
        conversion={'sourceSha256':hashlib.sha256(original).hexdigest(),'adapterVersion':1,'operations':['MkDocs Markdown to HTML','local asset and link rewriting','stable block anchors','math and footnotes','image caption grouping'], 'codeReferences':len(examples or []),'animationGroups':len(animations or [])}
    data={**record,'html':body,'codeExamples':examples or [],'animations':animations or [],'conversion':conversion}
    write_json(PUBLIC/'book/pages'/f'{record["id"]}.json',data)
    routefile=ROOT/'web/read'/f'{record["id"]}.md'
    routefile.parent.mkdir(parents=True,exist_ok=True)
    routefile.write_text('---\n'+yaml.safe_dump({'title':record['title'],'bookId':record['id']},allow_unicode=True)+'---\n',encoding='utf8',newline='\n')
    parsed=BeautifulSoup(body,'html.parser');plain=parsed.get_text(' ',strip=True)
    search.append({'id':record['id'],'title':record['title'],'group':record['group'],'text':plain,'blocks':[{'blockId':tag['data-block'],'text':tag.get_text(' ',strip=True)} for tag in parsed.select('[data-block]')]})
    records.append(record)

if __name__=='__main__':
    if not SOURCE.exists(): raise SystemExit('Run python scripts/download-source.py first')
    nav=flatten_nav(yaml.safe_load((SOURCE/'mkdocs.yml').read_text(encoding='utf8'))['nav'])
    nav=[n for n in nav if not n[0].startswith('chapter_paperbook/')]
    assert len(nav)==118, f'Expected 118 textbook pages, got {len(nav)}'
    code_index={lang:[p for p in (SOURCE/'codes'/lang).rglob('*') if p.suffix in SUFFIXES] for lang in LANGUAGES}
    route_map={p:f'/read/{p[:-3]}' for p,_,_ in nav}
    route_map['index.md']='/read/contents'
    records=[];search=[];stats={'pages':0,'codeReferences':0,'codeVariants':0,'animationGroups':0,'animationFrames':0,'fullFileDisplays':0}
    editorial=json.loads((ROOT/'content/editorial.json').read_text(encoding='utf8'))
    def add_editorial(id):
        info=editorial[id]
        body=markdown.markdown(info['markdown'],extensions=['extra'])
        soup=BeautifulSoup(body,'html.parser')
        for i,tag in enumerate(soup.find_all(recursive=False)): tag['data-block']=f'b{i}'
        publish(page_record(id,info['title'],info.get('kind','editorial'),info.get('group','卷首')),str(soup))
    def add_source(item):
        path,label,group=item
        text=(SOURCE/'docs'/path).read_text(encoding='utf8')
        title=label or re.search(r'^# (.+)',text,re.M)[1]
        record=page_record(path[:-3],title,'chapter',group,path)
        body,examples,animations=convert(text,pathlib.PurePosixPath(path),record['id'])
        if path=='chapter_searching/binary_search.md':
            body+='<div class="activity-invitation" data-block="activity"><span>动手试一试</span><h3>二分查找 · 星轨试炼</h3><p>完成三道小练习，检查你的理解。</p><button data-action="activity">开始练习</button></div>'
            record['activityId']='binary-search'
        publish(record,body,examples,animations)
        stats['pages']+=1;stats['codeReferences']+=len(examples)
        stats['codeVariants']+=sum(len(e['variants']) for e in examples)
        stats['fullFileDisplays']+=sum(v['extraction'].startswith('file') for e in examples for v in e['variants'])
        stats['animationGroups']+=len(animations);stats['animationFrames']+=sum(map(len,animations))
    for id in ['cover','title','copyright','dedication','editor-preface']: add_editorial(id)
    for item in nav:
        if item[0].startswith(('chapter_hello_algo/','chapter_preface/')): add_source(item)
    add_editorial('contents')
    for item in nav:
        if not item[0].startswith(('chapter_hello_algo/','chapter_preface/','chapter_appendix/','chapter_reference/')): add_source(item)
    for id in ['afterword','acknowledgements']: add_editorial(id)
    for item in nav:
        if item[0].startswith(('chapter_appendix/','chapter_reference/')): add_source(item)
    for id in ['index','about','back-cover']: add_editorial(id)
    write_json(PUBLIC/'book/manifest.json',{'title':'星轨编程','subtitle':'Python 与算法的探索之旅','version':'0.1.0','sourceCommit':SHA,'pages':records})
    write_json(PUBLIC/'book/search.json',search)
    write_json(ROOT/'docs/import-report.json',{'sourceCommit':SHA,**stats,'totalBookSections':len(records),'transformations':['MkDocs admonitions/details','tabbed diagrams','source code references','math markup','local images and links','stable block anchors']})
    # Images keep their original directory layout. Only referenced web assets are shipped.
    for path in (SOURCE/'docs').rglob('*'):
        if path.is_file() and path.suffix.lower() in {'.png','.jpg','.jpeg','.gif','.svg','.webp','.mp4','.webm','.pdf'}:
            target=PUBLIC/'upstream'/path.relative_to(SOURCE/'docs');target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,target)
    python_files={p.relative_to(SOURCE/'codes/python').as_posix():p.read_text(encoding='utf8') for p in (SOURCE/'codes/python').rglob('*.py')}
    write_json(PUBLIC/'book/python-files.json',python_files)
    (ROOT/'web/index.md').write_text('---\ntitle: 星轨编程\nbookId: cover\n---\n',encoding='utf8',newline='\n')
    print(json.dumps(stats,ensure_ascii=False))
