/** Keep source TeX as one logical text segment when KaTeX adds duplicate DOM text. */
export function retainMathText(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>(".arithmatex").forEach((node) => {
    node.dataset.tex ??= node.textContent || "";
  });
}
export function canonicalText(root: Node): string {
  const clone = root.cloneNode(true) as HTMLElement;
  if (clone.matches?.(".arithmatex"))
    return clone.dataset.tex ?? clone.textContent ?? "";
  clone
    .querySelectorAll?.<HTMLElement>(".arithmatex")
    .forEach(
      (node) => (node.textContent = node.dataset.tex ?? node.textContent),
    );
  clone.querySelectorAll?.("[data-text-ignore]").forEach(n=>n.remove());
  return clone.textContent || "";
}
export function textSegments(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT),
    seen = new Set<HTMLElement>(),
    segments: { node: Text; text: string; atomic: boolean }[] = [];
  let next: Node | null;
  while ((next = walker.nextNode())) {
    const node = next as Text,
      math = node.parentElement?.closest<HTMLElement>(".arithmatex");
    if(node.parentElement?.closest("[data-text-ignore]"))continue;
    if (math) {
      if (!seen.has(math)) {
        seen.add(math);
        segments.push({
          node,
          text: math.dataset.tex ?? math.textContent ?? "",
          atomic: true,
        });
      }
    } else segments.push({ node, text: node.data, atomic: false });
  }
  return segments;
}
