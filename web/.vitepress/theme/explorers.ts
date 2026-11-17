/**
 * 章节「探险入口」卡片 —— 旧版每章正文开头的引导卡：
 * eyebrow（第 X 章 · 主题 · 探险入口）+ 标题 + 带术语标注的说明 + 金色「开始探险 →」按钮。
 * 在 decorateTerms（分页测量）之前注入，保证卡片文字也获得术语下划线并计入分页。
 */
import { chapterLearning } from './chapter-learning';
interface Explorer {
  /** 卡片出现在哪一节 */
  sectionId: string;
  eyebrow: string;
  title: string;
  text: string;
  /** 「开始探险」按钮跳到哪一节 */
  target: string;
}

const EXPLORERS: Explorer[] = [
  {
    sectionId: "chapter_graph/graph",
    eyebrow: "第 9 章 · 图 · 探险入口",
    title: "先把这张「关系网」走一遍",
    text: "图最有意思的地方不在定义，而在「走过去」。下面这节会带你亲手加一条边、圈一个顶点，再让遍历算法一帧一帧跑起来。",
    target: "chapter_graph/graph_operations",
  },
  {
    sectionId: "chapter_searching/binary_search",
    eyebrow: "第 10 章 · 搜索 · 探险入口",
    title: "每次都猜中间的那一个",
    text: "在排好序的书架上找一本书，从中间翻开最划算。下面这节会让你亲手折半，看着查找范围一格一格缩小。",
    target: "chapter_searching/binary_search_insertion",
  },
  {
    sectionId: "chapter_sorting/sorting_algorithm",
    eyebrow: "第 11 章 · 排序 · 探险入口",
    title: "把一堆乱牌理成顺子",
    text: "排序是最适合「看着它发生」的算法。我们先从冒泡排序开始：相邻两个比一比，大的往后丢，一轮跑完，顺序就自己浮出来了。",
    target: "chapter_sorting/bubble_sort",
  },
];

const invitations: Record<string, [string, string]> = {
  chapter_preface: ['为这次学习安排一条路线', '先了解本书的阅读方式，再选择适合自己的学习节奏。读完后，用章末检查题回顾如何阅读、练习和复盘。'],
  chapter_introduction: ['从身边的步骤发现算法', '把一个日常任务拆成清晰步骤，再想想数据如何组织。带着这个例子阅读下一节，区分算法与数据结构。'],
  chapter_computational_complexity: ['看看输入变大以后会发生什么', '用小规模输入数一数操作次数，再把输入翻倍。观察迭代与递归，比较时间和空间随规模增长的方式。'],
  chapter_data_structure: ['从一位二进制认识数据', '先区分线性与非线性结构，再观察基本类型和编码。同样的信息，不同表示方式会怎样影响存储？'],
  chapter_array_and_linkedlist: ['比较连续格子和节点链条', '跟着图解追踪一次访问、插入和删除，比较数组移动元素与链表修改引用的区别。'],
  chapter_stack_and_queue: ['让元素排一次队，再叠一次栈', '用 A、B、C 模拟入栈出栈与入队出队，预测下一次取出的元素，检查先进先出与后进先出。'],
  chapter_hashing: ['给每个键找到它的桶', '跟踪键如何映射到桶，再让两个键发生冲突。观察冲突处理如何保留数据，以及负载如何影响效率。'],
  chapter_tree: ['沿着分支读懂一棵树', '先辨认根、叶与子树，再按不同顺序访问节点。用一个小例子检查遍历结果与搜索路径。'],
  chapter_heap: ['让最重要的元素浮到顶部', '观察插入与删除后元素怎样上浮、下沉，再思考为什么只看堆顶就能得到当前极值。'],
  chapter_divide_and_conquer: ['把大问题拆成可以处理的小问题', '跟踪一次分解、递归与合并，找出基本情况。用小实例核对每个子问题如何组成原问题的答案。'],
  chapter_backtracking: ['做一个选择，再退回来', '记录路径与可选项，观察递归返回时如何撤销选择。再判断哪些分支可以提前剪去。'],
  chapter_dynamic_programming: ['让已经解决的小问题帮忙', '写清每个状态代表什么，列出边界，再沿依赖顺序填表。比较重复递归与保存结果的计算次数。'],
  chapter_greedy: ['眼前最好的选择，最后也最好吗', '先提出局部选择规则，再尝试寻找反例。比较可拆分与不可拆分的背包，检查规则适用的条件。'],
  chapter_appendix: ['为实践准备好工具和术语', '核对运行环境，练习用术语表回查概念，并学习提供可复现的代码问题说明。'],
};
for (const chapter of chapterLearning) {
  if (EXPLORERS.some(e => e.sectionId.startsWith(chapter.id + '/'))) continue;
  const [title, text] = invitations[chapter.id];
  EXPLORERS.push({ sectionId: chapter.intro, eyebrow: chapter.title + ' · 探险入口', title, text, target: chapter.target });
}

export function injectExplorers(source: HTMLElement) {
  const id = source.dataset.section;
  if (!id) return;
  const explorer = EXPLORERS.find((e) => e.sectionId === id);
  if (!explorer || source.querySelector(".explorer-card")) return;
  const card = document.createElement("aside");
  card.className = "explorer-card";
  card.dataset.block = "explorer-" + id!.replaceAll("/", "-");
  card.innerHTML =
    `<span class="explorer-eyebrow">${explorer.eyebrow}</span>` +
    `<span class="explorer-star" aria-hidden="true">🚀</span>` +
    `<h3>${explorer.title}</h3>` +
    `<p>${explorer.text}</p>` +
    `<button class="explorer-go" data-action="explorer" data-target="${explorer.target}">开始探险 <span aria-hidden="true">→</span></button>`;
  const heading = source.querySelector("h1");
  if (heading) heading.insertAdjacentElement("afterend", card);
  else source.prepend(card);
}
