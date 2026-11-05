"""Versioned authored activity overlays, applied before stable block registration."""
import json
from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT/'content/chapter-enhancements/scenes.json').read_text(encoding='utf8'))

CHAPTER_BRIEFS = {
    'chapter_stack_and_queue': {
        'intro': '货舱里有三种装载舱门：栈顶只允许最后放入的物件先离开，队列则让最早到达的信号先通过，双向队列还能从两端调度。先弄清规则，再决定如何安排数据。',
        'title': '货舱顺序调度',
        'mission': '完成栈顶装卸、队列放行与双端舱门三站任务，观察“进入顺序”怎样决定“离开顺序”。',
        'steps': ['栈：后进先出', '队列：先进先出', '双向队列：两端都可操作']
    },
    'chapter_hashing': {
        'intro': '通信舱要把大量信标编号快速映射到存储槽。哈希函数负责定位；当多个编号落到同一槽位时，还需要一套可靠的冲突处理规则。',
        'title': '信标快速定位',
        'mission': '先观察编号如何映射到槽位，再处理碰撞，最后检查哈希函数为什么需要稳定且均匀。',
        'steps': ['哈希映射', '冲突探测', '函数设计']
    },
    'chapter_tree': {
        'intro': '空间站的巡检路线是一棵树。机器人可以先检查站点本身，也可以先巡检左侧或右侧；改一下访问顺序，记录就会完全不同。',
        'title': '空间站节点巡检',
        'mission': '从树的结构出发，练习层序与深度优先遍历，再把节点关系转成可计算的表示。',
        'steps': ['看懂节点与子树', '逐步遍历', '利用有序结构查找']
    },
    'chapter_heap': {
        'intro': '调度中心需要随时找到最紧急的任务。堆把优先级最高的节点放在堆顶，并用局部调整维持整棵完全二叉树的顺序。',
        'title': '优先级调度中心',
        'mission': '先看清堆顶规则，再逐步观察建堆；每次交换后都检查父节点与子节点的优先级关系。',
        'steps': ['认识堆顶与堆底', '从下往上建堆', '用堆解决 Top-k']
    }
}
CHAPTER_NUMBERS = {'chapter_stack_and_queue':5,'chapter_hashing':6,'chapter_tree':7,'chapter_heap':8}

PAGE_INTROS = {
    'chapter_stack_and_queue/stack': '把维修舱的工具一件件压入存放架。取用时只能先拿最上方那件：最后放入的元素最先离开，这就是栈的后进先出。',
    'chapter_stack_and_queue/queue': '巡检信号按到达时间排队，队首先处理、队尾继续接收新信号。我们用逐步放行来观察先进先出的规则。',
    'chapter_stack_and_queue/deque': '双向队列有两个舱门：可以从任意一端加入或移除元素。观察两端同时开放后，调度方式怎样扩展。',
    'chapter_hashing/hash_map': '每个信标编号经过哈希函数后，会落到一个存储槽。调整编号，观察映射结果如何变化。',
    'chapter_hashing/hash_collision': '不同信标可能映射到同一槽位。本演示使用线性探测：槽位被占用时，沿表格逐格寻找下一个空位。',
    'chapter_tree/binary_tree_traversal': '巡检机器人每到一个节点，都可以先记录当前站点，或先进入子树。逐步切换遍历顺序，观察访问序列如何变化。',
    'chapter_heap/heap': '调度器始终把当前最高优先级任务放在堆顶。通过数组观察完全二叉树的父子位置关系。',
    'chapter_heap/build_heap': '把一组未整理的任务编号从底层开始调整。每次让较高优先级的节点上浮到合适位置，直到整个结构满足堆序。'
}

def overlay(body, section):
    soup = BeautifulSoup(body, 'html.parser')
    # Preserve original TeX at conversion time, before any KaTeX rendering.
    for formula in soup.select('.arithmatex'):
        formula['data-tex'] = formula.get_text()
    entry = CONFIG['chapters'].get(section)
    chapter = section.split('/',1)[0]
    brief = CHAPTER_BRIEFS.get(chapter)
    key = section.split('/',1)[-1]
    heading = soup.find('h1')
    if brief and heading:
        if key == 'index':
            heading.insert_after(BeautifulSoup(f'<p class="ch12-intro">{brief["intro"]}</p>', 'html.parser'))
            abstract = soup.select_one('.admonition.abstract')
            anchor = abstract or soup.find('figure') or heading
            card = BeautifulSoup(
                f'<div class="ch12-card chapter-mission-card"><p class="ch12-eyebrow">PLEX · 第 {CHAPTER_NUMBERS[chapter]} 章任务简报</p>'
                f'<h3>{brief["title"]}</h3><p>{brief["mission"]}</p>'
                f'<ol>{"".join(f"<li>{item}</li>" for item in brief["steps"])}</ol></div>', 'html.parser')
            anchor.insert_after(card)
        elif section in PAGE_INTROS:
            heading.insert_after(BeautifulSoup(f'<p class="ch12-intro">{PAGE_INTROS[section]}</p>', 'html.parser'))
    if not entry:
        return str(soup)
    if brief:
        chapter_label = f'第 {CHAPTER_NUMBERS[chapter]} 章 · 星轨任务'
        markup = (f'<div class="chapter-scene-card ch12-card"><p class="ch12-eyebrow">{chapter_label}</p><h3>{entry["title"]}</h3>'
            '<p>教学演示：可修改输入，自动播放或逐步查看解释。原教材图解保留在下方，可随时对照。</p>'
            f'<button data-action="teaching-scene" data-scene="{entry["scene"]}">打开{entry["title"]}演示</button></div>')
    else:
        markup = (f'<div class="chapter-scene-card"><h3>{entry["title"]} · 动手观察</h3>'
            '<p>教学演示：可修改输入，自动播放或逐步查看解释。原教材图解保留在下方，可随时对照。</p>'
            f'<button data-action="teaching-scene" data-scene="{entry["scene"]}">打开{entry["title"]}演示</button></div>')
    activity = BeautifulSoup(markup, 'html.parser')
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
