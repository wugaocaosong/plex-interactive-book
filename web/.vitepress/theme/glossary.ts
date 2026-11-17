import { canonicalText } from './text-coordinates';
import { glossaryName } from './glossary-name.mjs';
export interface GlossaryEntry {
  term: string;
  english: string;
  definition: string;
  sectionId: string;
  /** 原版本的首次出现位置，仅保留为元数据，不限制其他小节查看解释。 */
  homeSection?: string;
  /** 人话解释：给完全不懂的读者的一句话类比 */
  tip?: string;
  /** 相关快捷键，鼠标悬停时顺带提示 */
  keys?: string[];
}

export function decorateGlossary(root: HTMLElement, entries: GlossaryEntry[]) {
  const byName = new Map(entries.map(entry => [entry.term, entry]));
  // Original book underlines and chapter-specific terms use the same interaction.
  // Explicit labels are never suppressed by the per-section repetition filter.
  root.querySelectorAll<HTMLElement>('u,.ch12-term').forEach(node => {
    const label = node.dataset.term || canonicalText(node);
    const name = glossaryName(label);
    const entry = byName.get(name);
    if (!entry) return;
    node.querySelectorAll<HTMLElement>('.glossary-term').forEach(child => child.replaceWith(...child.childNodes));
    node.classList.remove('ch12-term');
    node.classList.add('glossary-term');
    node.dataset.action = 'term';
    node.dataset.term = entry.term;
    node.dataset.definition = entry.definition;
    node.tabIndex = 0;
    node.setAttribute('role', 'button');
    node.setAttribute('aria-label', `解释术语：${entry.term}`);
  });
  const used = new Set<string>(
    [...root.querySelectorAll<HTMLElement>('.glossary-term,.ch12-term')]
      .map(el => el.dataset.term || el.textContent || ''),
  );
  const sorted = [...entries]
    // Ambiguous single characters such as 图 in “如下图” are only marked when
    // explicitly underlined by the author, rather than treating illustrations as graphs.
    .filter((e) => e.term.length >= 2 || ['栈', '堆'].includes(e.term))
    .sort((a, b) => b.term.length - a.term.length);
  if (!sorted.length) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode()))
    if (
      !node.parentElement?.closest(
        "a,button,pre,code,textarea,.route-lab-card,.lab-editor,.katex,.arithmatex,.glossary-term,.ch12-term,.explorer-card,mark,h1,h2,h3,h4,header,figcaption",
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
