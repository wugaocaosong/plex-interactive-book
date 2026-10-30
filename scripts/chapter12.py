"""Authored chapter overlay; never writes upstream sources. Used by import_book."""
import html
import json
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'chapter_divide_and_conquer/'
CONFIG = json.loads((ROOT/'content/chapter12/config.json').read_text(encoding='utf8'))
SEEN = set()

def prepare():
    SEEN.clear()
    dest = ROOT/'web/public/chapter12'
    dest.mkdir(exist_ok=True)
    (dest/'config.json').write_text(json.dumps(CONFIG, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
    import shutil
    for asset in (ROOT/'content/chapter12').glob('*.svg'):
        shutil.copyfile(asset, dest/asset.name)
    for field in ('src','captions'):
        url=CONFIG['video'].get(field)
        if not url: continue
        if not url.startswith('/chapter12/'): raise ValueError('Video and captions must use /chapter12/ local paths')
        source=(ROOT/'content'/url.lstrip('/')).resolve()
        if not source.is_relative_to((ROOT/'content/chapter12').resolve()) or not source.is_file(): raise ValueError(f'Missing local chapter asset: {url}')
        target=ROOT/'web/public'/url.lstrip('/');target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target)

def invitation(title, text, mode, label='打开互动实验'):
    return f'<div class="ch12-card"><p class="ch12-eyebrow">PLEX · 第 12 章任务</p><h3>{title}</h3><p>{text}</p><button data-action="chapter12" data-mode="{mode}">{label}</button></div>'

def overlay(body, section, registry=None):
    if not CONFIG['enabled'] or not section.startswith(PREFIX): return body
    key = section.removeprefix(PREFIX)
    soup = BeautifulSoup(body, 'html.parser')
    intro = {
      'divide_and_conquer': '星舰收到一批顺序混乱的能源模块。把它们分给小队，各自整理，再合成一条有序补给线。今天我们用这个任务理解分治：拆分、求解，再按需要组合答案。',
      'binary_search_recur': '通讯舱要在排好序的信号编号中找到目标。每次查看中间编号，就可以排除一半不可能的信号；这次用递归写出相同的查找过程。',
      'build_binary_tree_problem': '两份巡检记录描述同一座空间站：前序遍历记录到站时的顺序，中序遍历记录左侧检查完成后的顺序。如何找出根节点，再分别重建左右子树？本例的节点编号互不相同。',
      'hanota_problem': '把能源环从 A 柱搬到 C 柱，B 柱作为临时停靠点：每次只能拿最上方的一环，小环必须在大环上面。只有一个环时就是基准情况，可以直接搬到目标柱。',
      'summary': '回看你的任务：先判断是否能拆分，再找停止条件，最后说明答案怎样返回或合并。二分查找不需要合并两边的答案；递归也不意味着自动并行。'
    }
    heading = soup.find('h1')
    if key in intro and heading:
        heading.insert_after(BeautifulSoup(f'<p class="ch12-intro">{intro[key]}</p>', 'html.parser'))
    if key == 'index':
        v = CONFIG['video']
        media = f'<img src="{html.escape(v["poster"])}" alt="能源模块拆分与合并课程封面"/>'
        if v['src']:
            if not v['src'].startswith('/chapter12/'): raise ValueError('Chapter video must be a local /chapter12/ asset')
            media = f'<video controls preload="metadata" poster="{html.escape(v["poster"])}" src="{html.escape(v["src"])}">'
            if v['captions']: media += f'<track kind="captions" srclang="zh" label="中文字幕" src="{html.escape(v["captions"])}" default/>'
            media += '当前浏览器不支持视频，请继续阅读下文。</video>'
        soup.append(BeautifulSoup(f'<div class="ch12-video"><h2>{v["title"]}</h2>{media}<p>{"点击播放课程视频" if v["src"] else "导入视频后可播放 · 现在也可以直接阅读和实验"}</p></div><p>学习目标：能解释拆分与停止条件，观察搜索和建树过程，用 Python 验证自己的想法。</p>', 'html.parser'))
    if key == 'divide_and_conquer':
        soup.select_one('.ch12-intro').insert_after(BeautifulSoup(invitation('本章探险路线', '从整理能源模块出发，依次探索搜索、重建结构和递归搬运。可以跳过、返回并继续未完成的任务。', 'route', '开始探险！'), 'html.parser'))
    replacements = {
      'divide_and_conquer_merge_sort.png':'merge.svg', 'binary_search_recur.png':'search.svg',
      'build_tree_example.png':'tree.svg', 'build_tree_preorder_inorder_division.png':'tree.svg', 'hanota_example.png':'hanoi.svg'
    }
    for img in soup.find_all('img'):
        original = img.get('src','').split('/')[-1]
        if original in replacements:
            img['src']='/chapter12/'+replacements[original]
            img['data-action']='image'
            if key == 'divide_and_conquer':
                img.find_parent('figure').insert_after(BeautifulSoup(invitation('拆分合并 · 能源补给线', '修改模块编号，观察拆到最小任务后如何逐层合并。', 'merge'), 'html.parser'))
    if key == 'hanota_problem':
        first = soup.select_one('.step-player')
        if first: first.insert_before(BeautifulSoup(invitation('能源环搬运实验', '先手动搬运，再观察标准解。移动前说出源柱、目标柱与规则。', 'hanoi'), 'html.parser'))
        for figure in soup.select('.step-player'):
            details=soup.new_tag('details'); label=soup.new_tag('summary');label.string='展开原逐帧图解对照'
            # Wrapping an unchanged figure must not orphan existing block notes.
            old_id=(registry or {}).get(section,{}).get('aliases',{}).get(figure.get('data-block'))
            if old_id: details['data-preserve-block']=old_id
            figure.wrap(details);details.insert(0,label)
    if key == 'summary': soup.append(BeautifulSoup(invitation('回到本章路线', '访问、实验完成和代码测试分别记录；打开过页面并不表示已经掌握。', 'route', '查看本章活动记录'), 'html.parser'))
    task = {'divide_and_conquer':'merge', 'binary_search_recur':'search', 'build_binary_tree_problem':'tree', 'hanota_problem':'hanoi', 'exercises':'power'}.get(key)
    if task:
        from chapter12_tasks import TASKS
        entry=next(e for e in TASKS if e['id']=='ch12-'+task)
        markup=BeautifulSoup(invitation(entry['title'],entry['description'],'code-'+task,'动手写代码'), 'html.parser')
        preview=BeautifulSoup('<pre><code>'+html.escape(entry['starter'])+'</code></pre>', 'html.parser')
        markup.select_one('button').insert_before(preview)
        # Place after the explanation and before the existing implementation, if present.
        anchor=soup.select_one('.code-example')
        if not anchor: anchor=next((n for n in soup.find_all(['h2','h3']) if '代码实现' in n.get_text()),None)
        if anchor: anchor.insert_before(markup)
        else: soup.append(markup)
    return str(soup)

def terms(body, section):
    """After stable IDs: markup adds no text, preserving offsets and fingerprints."""
    if not CONFIG['enabled'] or not section.startswith(PREFIX): return body
    soup=BeautifulSoup(body,'html.parser')
    if section.endswith('/index'): return body
    for node in list(soup.find_all(string=True)):
        if any(p.name in ('h1','h2','h3','h4','pre','code','a','button','figcaption','summary') or set(p.get('class',[])) & {'ch12-card','arithmatex','katex'} for p in node.parents): continue
        remaining=str(node); pieces=[]
        while remaining:
            candidates=[(remaining.find(t),-len(t),t) for t in CONFIG['terms'] if t not in SEEN and t in remaining]
            if not candidates: pieces.append(NavigableString(remaining));break
            pos,_,term=min(candidates)
            pieces.append(NavigableString(remaining[:pos]))
            span=soup.new_tag('span',attrs={'class':'glossary-term ch12-term','data-action':'ch12-term','data-term':term,'data-definition':CONFIG['terms'][term], 'tabindex':'0','role':'button','aria-label':f'解释术语：{term}'})
            span.string=term;pieces.append(span);SEEN.add(term);remaining=remaining[pos+len(term):]
        node.replace_with(*pieces)
    return str(soup)
