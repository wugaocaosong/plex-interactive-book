/**
 * 章节「探险入口」卡片 —— 旧版每章正文开头的引导卡：
 * eyebrow（第 X 章 · 主题 · 探险入口）+ 标题 + 带术语标注的说明 + 金色「开始探险 →」按钮。
 * 在 decorateTerms（分页测量）之前注入，保证卡片文字也获得术语下划线并计入分页。
 */
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
