export interface Leaf {
  html: string;
  blockId: string;
  offset: number;
}

/** Clone a text range with its inline markup intact. Offsets address source text, not page numbers. */
function textSlice(element: HTMLElement, start: number, end: number) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let next: Node | null;
  while ((next = walker.nextNode())) nodes.push(next as Text);
  const range = document.createRange();
  let position = 0;
  let begun = false;
  for (const node of nodes) {
    const length = node.length;
    if (!begun && start <= position + length) {
      range.setStart(node, Math.max(0, start - position));
      begun = true;
    }
    if (begun && end <= position + length) {
      range.setEnd(node, Math.max(0, end - position));
      break;
    }
    position += length;
  }
  const clone = element.cloneNode(false) as HTMLElement;
  clone.append(range.cloneContents());
  return clone;
}

export function paginate(
  source: HTMLElement,
  measure: HTMLElement,
  maxHeight: number,
): Leaf[] {
  const leaves: Leaf[] = [];
  let blockId = "b0";
  let offset = 0;
  const flush = () => {
    if (!measure.childNodes.length) return;
    leaves.push({ html: measure.innerHTML, blockId, offset });
    measure.replaceChildren();
  };
  const begin = (element: HTMLElement) => {
    if (!measure.childNodes.length) {
      blockId = element.dataset.block || "b0";
      offset = Number(element.dataset.start || 0);
    }
  };
  const fits = () => measure.scrollHeight <= maxHeight + 1;
  const queue = [...source.children].map(
    (node) => node.cloneNode(true) as HTMLElement,
  );
  for (let index = 0; index < queue.length; index++) {
    const element = queue[index];
    // Lists may continue on the next leaf, with numbering preserved.
    if (/^(UL|OL)$/.test(element.tagName) && element.children.length > 1) {
      const pieces = [...element.children].map((li, i) => {
        const list = element.cloneNode(false) as HTMLElement;
        const prefix = document.createRange();
        prefix.selectNodeContents(element);
        prefix.setEndBefore(li);
        list.dataset.start = String(
          Number(element.dataset.start || 0) + prefix.toString().length,
        );
        if (element.tagName === "OL")
          list.setAttribute(
            "start",
            String(Number(element.getAttribute("start") || 1) + i),
          );
        list.append(li.cloneNode(true));
        return list;
      });
      queue.splice(index, 1, ...pieces);
      index--;
      continue;
    }
    begin(element);
    measure.append(element);
    const reserve =
      /^H[1-6]$/.test(element.tagName) && index < queue.length - 1 ? 72 : 0;
    if (fits() && measure.scrollHeight + reserve <= maxHeight) continue;
    element.remove();
    if (measure.childNodes.length) {
      const headings: HTMLElement[] = [];
      while (
        measure.lastElementChild &&
        /^H[1-6]$/.test(measure.lastElementChild.tagName)
      ) {
        const heading = measure.lastElementChild as HTMLElement;
        heading.remove();
        headings.unshift(heading);
      }
      flush();
      for (const heading of headings) {
        begin(heading);
        measure.append(heading);
      }
      begin(element);
      measure.append(element);
    } else measure.append(element);
    if (fits()) continue;
    element.remove();
    const text = element.textContent || "";
    if (
      /^(P|BLOCKQUOTE|UL|OL)$/.test(element.tagName) &&
      !element.querySelector("img, pre, .katex, button") &&
      text.length > 80
    ) {
      let consumed = 0;
      while (consumed < text.length) {
        let low = 1,
          high = text.length - consumed,
          best = 1;
        while (low <= high) {
          const middle = Math.floor((low + high) / 2);
          const part = textSlice(element, consumed, consumed + middle);
          measure.append(part);
          const valid = fits();
          part.remove();
          if (valid) {
            best = middle;
            low = middle + 1;
          } else high = middle - 1;
        }
        const part = textSlice(element, consumed, consumed + best);
        part.dataset.start = String(
          Number(element.dataset.start || 0) + consumed,
        );
        begin(part);
        measure.append(part);
        consumed += best;
        if (consumed < text.length) flush();
      }
    } else {
      // A large atomic block gets an explicit full-content viewer. Nothing is silently discarded.
      const card = document.createElement("div");
      card.className = "expanded-block";
      card.dataset.block = element.dataset.block;
      const title =
        element.querySelector("h1,h2,h3,h4,summary,figcaption")?.textContent ||
        (element.tagName === "TABLE" ? "数据表格" : "完整内容");
      const heading = document.createElement("p");
      heading.textContent = title;
      const button = document.createElement("button");
      button.dataset.action = "expand";
      button.dataset.block = element.dataset.block;
      button.textContent = "展开阅读";
      card.append(heading, button);
      begin(card);
      measure.append(card);
    }
  }
  flush();
  return leaves.length
    ? leaves
    : [{ html: "<p>本节暂无内容。</p>", blockId: "b0", offset: 0 }];
}

export function locateLeaf(leaves: Leaf[], block: string, offset = 0) {
  let found = leaves.findIndex(
    (leaf) =>
      leaf.blockId === block ||
      leaf.html.includes(`data-block="${block}"`) ||
      leaf.html.includes(`id="${block}"`),
  );
  if (found < 0) return 0;
  for (
    let i = found + 1;
    i < leaves.length && leaves[i].blockId === block;
    i++
  ) {
    if (leaves[i].offset <= offset) found = i;
  }
  return found;
}
