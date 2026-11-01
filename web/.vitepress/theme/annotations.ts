import type { AnnotationRecord, ReadingLocator } from "./types";
import { canonicalText, textSegments } from "./text-coordinates";
export function normalizeText(text: string) {
  let value = "";
  const offsets: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i].toLocaleLowerCase();
    if (/\s/.test(char)) {
      if (value.endsWith(" ")) continue;
      value += " ";
    } else value += char;
    offsets.push(i);
  }
  return { value, offsets };
}
export function searchText(text: string, query: string) {
  const normalized = normalizeText(text),
    needle = normalizeText(query.trim()).value;
  const position = needle ? normalized.value.indexOf(needle) : -1;
  return position < 0
    ? null
    : {
        offset: normalized.offsets[position],
        end: (normalized.offsets[position + needle.length - 1] ?? 0) + 1,
      };
}
export function sourceBlocks(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>("[data-block]")].filter(
    (el) => !el.parentElement?.closest("[data-block]"),
  );
}
function offsetAt(element: HTMLElement, node: Node, offset: number) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.setEnd(node, offset);
  return (
    canonicalText(range.cloneContents()).length +
    Number(element.dataset.start || 0)
  );
}
export function captureSelection(
  root: HTMLElement,
  sectionId: string,
  contentVersion?: string,
): AnnotationRecord | undefined {
  const selection = getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  const start = (
    range.startContainer.nodeType === 3
      ? range.startContainer.parentElement
      : (range.startContainer as HTMLElement)
  )?.closest<HTMLElement>("[data-block]");
  const end = (
    range.endContainer.nodeType === 3
      ? range.endContainer.parentElement
      : (range.endContainer as HTMLElement)
  )?.closest<HTMLElement>("[data-block]");
  if (
    !start ||
    !end ||
    !root.contains(start) ||
    !root.contains(end) ||
    range.cloneContents().querySelector("pre,button,img")
  )
    return;
  const now = new Date().toISOString();
  const startOffset = offsetAt(start, range.startContainer, range.startOffset),
    endOffset = offsetAt(end, range.endContainer, range.endOffset);
  const text = canonicalText(start),
    endText = canonicalText(end);
  return {
    id: crypto.randomUUID(),
    sectionId,
    kind: "highlight",
    start: {
      sectionId,
      blockId: start.dataset.block!,
      offset: startOffset,
      contentVersion,
    },
    end: {
      sectionId,
      blockId: end.dataset.block!,
      offset: endOffset,
      contentVersion,
    },
    exact: canonicalText(range.cloneContents()),
    prefix: text.slice(Math.max(0, startOffset - 32), startOffset),
    suffix: endText.slice(endOffset, endOffset + 32),
    note: "",
    status: "located",
    createdAt: now,
    updatedAt: now,
  };
}
export function reanchor(
  note: AnnotationRecord,
  root: HTMLElement,
): AnnotationRecord {
  const blocks = sourceBlocks(root);
  const starts = blocks.map((b) => b.dataset.block!);
  const texts = blocks.map((b) => canonicalText(b));
  const joined = texts.join("");
  const positions: number[] = [];
  let total = 0;
  for (const text of texts) {
    positions.push(total);
    total += text.length;
  }
  const from = starts.indexOf(note.start.blockId),
    to = starts.indexOf(note.end.blockId);
  if (note.blockNote)
    return { ...note, status: from >= 0 ? "located" : "orphan" };
  if (
    from >= 0 &&
    to >= from &&
    joined.slice(
      positions[from] + note.start.offset,
      positions[to] + note.end.offset,
    ) === note.exact
  )
    return { ...note, status: "located" };
  const matches: number[] = [];
  for (
    let i = joined.indexOf(note.exact);
    note.exact && i >= 0;
    i = joined.indexOf(note.exact, i + 1)
  ) {
    if (
      (!note.prefix ||
        joined.slice(Math.max(0, i - note.prefix.length), i) === note.prefix) &&
      (!note.suffix ||
        joined.slice(
          i + note.exact.length,
          i + note.exact.length + note.suffix.length,
        ) === note.suffix)
    )
      matches.push(i);
  }
  if (matches.length !== 1) return { ...note, status: "orphan" };
  const location = (offset: number): ReadingLocator => {
    let i = positions.findLastIndex((p) => p <= offset);
    i = Math.max(0, i);
    return {
      sectionId: note.sectionId,
      blockId: starts[i],
      offset: offset - positions[i],
      contentVersion: note.start.contentVersion,
    };
  };
  return {
    ...note,
    start: location(matches[0]),
    end: location(matches[0] + note.exact.length),
    status: "located",
  };
}
export function markRange(
  element: HTMLElement,
  start: number,
  end: number,
  kind: string,
  id: string,
) {
  const pieces: { node: Text; start: number; end: number }[] = [];
  let offset = Number(element.dataset.start || 0);
  for (const { node, text, atomic } of textSegments(element)) {
    const len = text.length;
    if (
      !atomic &&
      offset < end &&
      offset + len > start &&
      !node.parentElement?.closest("button,pre,.katex")
    )
      pieces.push({
        node,
        start: Math.max(0, start - offset),
        end: Math.min(len, end - offset),
      });
    offset += len;
  }
  for (const piece of pieces.reverse()) {
    const range = document.createRange();
    range.setStart(piece.node, piece.start);
    range.setEnd(piece.node, piece.end);
    const mark = document.createElement("mark");
    mark.className = `annotation-${kind}`;
    mark.dataset.annotation = id;
    range.surroundContents(mark);
  }
}
export function decorateAnnotations(
  root: HTMLElement,
  notes: AnnotationRecord[],
) {
  const blocks = sourceBlocks(root);
  for (const note of notes.filter(
    (n) => n.status === "located" && !n.blockNote,
  )) {
    const start = blocks.findIndex(
        (b) => b.dataset.block === note.start.blockId,
      ),
      end = blocks.findLastIndex((b) => b.dataset.block === note.end.blockId);
    if (start < 0 || end < start) continue;
    for (let i = start; i <= end; i++)
      markRange(
        blocks[i],
        i === start ? note.start.offset : 0,
        i === end ? note.end.offset : Infinity,
        note.kind,
        note.id,
      );
  }
}
export function notesMarkdown(notes: AnnotationRecord[], origin: string) {
  return (
    "# 星轨编程 · 学习笔记\n\n" +
    notes
      .map(
        (n) =>
          `## ${n.sectionId}\n\n> ${n.exact.replace(/\n/g, "\n> ")}\n\n${n.note}\n\n[返回原文](${origin}/read/${n.sectionId}#${n.start.blockId}@${n.start.offset})${n.status === "orphan" ? " · 待重新定位" : ""}\n`,
      )
      .join("\n")
  );
}
