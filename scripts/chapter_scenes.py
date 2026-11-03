"""Versioned authored activity overlays, applied before stable block registration."""
import json
from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT/'content/chapter-enhancements/scenes.json').read_text(encoding='utf8'))


def overlay(body, section):
    soup = BeautifulSoup(body, 'html.parser')
    # Preserve original TeX at conversion time, before any KaTeX rendering.
    for formula in soup.select('.arithmatex'):
        formula['data-tex'] = formula.get_text()
    entry = CONFIG['chapters'].get(section)
    if not entry:
        return str(soup)
    activity = BeautifulSoup(f'<div class="chapter-scene-card"><h3>{entry["title"]} · 动手观察</h3>'
        '<p>教学演示：可修改输入，自动播放或逐步查看解释。原教材图解保留在下方，可随时对照。</p>'
        f'<button data-action="teaching-scene" data-scene="{entry["scene"]}">打开{entry["title"]}演示</button></div>', 'html.parser')
    first = soup.find('figure')
    if first:
        first.insert_before(activity)
        # Do not wrap existing blocks: their structure participates in stable IDs.
        link=soup.new_tag('p');button=soup.new_tag('button');button['data-action']='image'
        image=first.find('img')
        if image:
            source=image.get('src','')
            originals={'merge.svg':'divide_and_conquer.assets/divide_and_conquer_merge_sort.png','search.svg':'binary_search_recur.assets/binary_search_recur.png','tree.svg':'build_binary_tree_problem.assets/build_tree_example.png','hanoi.svg':'hanota_problem.assets/hanota_example.png'}
            if source.startswith('/chapter12/') and source.split('/')[-1] in originals:
                source='/upstream/chapter_divide_and_conquer/'+originals[source.split('/')[-1]]
            button['data-src']=source;button['data-alt']=image.get('alt','');button.string='查看原图';link.append(button);first.insert_after(link)
    else:
        heading=soup.find('h1')
        if heading: heading.insert_after(activity)
        else: soup.append(activity)
    return str(soup)
