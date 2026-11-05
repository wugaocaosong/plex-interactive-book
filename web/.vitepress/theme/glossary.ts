export interface GlossaryEntry {
  homeSection?: string;
  tip?: string;
  keys?: string[];
  term: string;
  english: string;
  definition: string;
  sectionId: string;
}
export function decorateGlossary(root: HTMLElement, entries: GlossaryEntry[]) {
  const used = new Set<string>();
  const section=root.dataset.section || root.closest<HTMLElement>("[data-section]")?.dataset.section;
  const sorted = [...entries]
    .filter((e) => e.term.length >= 2 && (!e.homeSection || !section || section===e.homeSection))
    .sort((a, b) => b.term.length - a.term.length);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode()))
    if (
      !node.parentElement?.closest(
        "a,button,pre,code,textarea,.route-lab-card,.katex,.arithmatex,.glossary-term,mark,h1,h2,h3,h4,header,figcaption",
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
      term.title = match.tip || match.definition;
      term.setAttribute("role", "button");
      term.setAttribute("aria-label", `解释术语：${match.term}`);
      fragment.append(term);
      used.add(match.term);
      remaining = remaining.slice(position + match.term.length);
    }
    node.replaceWith(fragment);
  }
}
