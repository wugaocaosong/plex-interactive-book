export interface GlossaryEntry {
  term: string;
  english: string;
  definition: string;
  sectionId: string;
  /** 这条术语应该在哪一节标注（全书写法只在首次出现处标一次） */
  homeSection?: string;
  /** 人话解释：给完全不懂的读者的一句话类比 */
  tip?: string;
  /** 相关快捷键，鼠标悬停时顺带提示 */
  keys?: string[];
}

/** 从容器往上找所在小节的 id */
function sectionOf(root: HTMLElement): string {
  return (
    root.dataset.section ??
    root.closest<HTMLElement>("[data-section]")?.dataset.section ??
    ""
  );
}

export function decorateGlossary(root: HTMLElement, entries: GlossaryEntry[]) {
  const used = new Set<string>();
  const section = sectionOf(root);
  const sorted = [...entries]
    .filter((e) => e.term.length >= 2)
    // 跨节去重：只在这条术语「首次出现」的那一节标注。
    // 拿不到 section（比如孤立片段）时退回旧行为，保证不会漏标。
    .filter((e) => !e.homeSection || !section || e.homeSection === section)
    .sort((a, b) => b.term.length - a.term.length);
  if (!sorted.length) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode()))
    if (
      !node.parentElement?.closest(
        "a,button,pre,code,textarea,.lab-editor,.katex,.arithmatex,.glossary-term,mark,h1,h2,h3,h4,header,figcaption",
      )
    )
      nodes.push(node as Text);
  for (const node of nodes) {
    let remaining = node.data;
    const fragment = document.createDocumentFragment();
    while (remaining) {
      let match: GlossaryEntry | undefined,
        position = Infinity;
      for (const entry of sorted) {
        if (used.has(entry.term)) continue;
        const p = remaining.indexOf(entry.term);
        if (p >= 0 && p < position) {
          match = entry;
          position = p;
        }
      }
      if (!match) {
        fragment.append(remaining);
        break;
      }
      fragment.append(remaining.slice(0, position));
      const term = document.createElement("span");
      term.textContent = match.term;
      term.className = "glossary-term";
      term.dataset.action = "term";
      term.dataset.term = match.term;
      term.tabIndex = 0;
      term.setAttribute("role", "button");
      term.setAttribute("aria-label", `解释术语：${match.term}`);
      fragment.append(term);
      used.add(match.term);
      remaining = remaining.slice(position + match.term.length);
    }
    node.replaceWith(fragment);
  }
}
