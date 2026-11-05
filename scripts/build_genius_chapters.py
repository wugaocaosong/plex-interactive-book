"""Extract chapters 9–11 from the supplied Genius DOCX into authored Markdown."""
from __future__ import annotations

import argparse
import re
import shutil
from pathlib import Path

from docx import Document
from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph
from docx.table import Table


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content/genius-chapters"
MEDIA_OUT = OUT / "media"
CHAPTERS = {
    9: {
        1: "chapter_graph/graph.md", 2: "chapter_graph/graph_operations.md",
        3: "chapter_graph/graph_traversal.md", 4: "chapter_graph/summary.md",
        5: "chapter_graph/exercises.md",
    },
    10: {
        1: "chapter_searching/binary_search.md", 2: "chapter_searching/binary_search_insertion.md",
        3: "chapter_searching/binary_search_edge.md", 4: "chapter_searching/replace_linear_by_hashing.md",
        5: "chapter_searching/searching_algorithm_revisited.md", 6: "chapter_searching/summary.md",
        7: "chapter_searching/exercises.md",
    },
    11: {
        1: "chapter_sorting/sorting_algorithm.md", 2: "chapter_sorting/selection_sort.md",
        3: "chapter_sorting/bubble_sort.md", 4: "chapter_sorting/insertion_sort.md",
        5: "chapter_sorting/quick_sort.md", 6: "chapter_sorting/merge_sort.md",
        7: "chapter_sorting/heap_sort.md", 8: "chapter_sorting/bucket_sort.md",
        9: "chapter_sorting/counting_sort.md", 10: "chapter_sorting/radix_sort.md",
        11: "chapter_sorting/summary.md", 12: "chapter_sorting/exercises.md",
    },
}
W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
M = "http://schemas.openxmlformats.org/officeDocument/2006/math"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


def mtag(name: str) -> str:
    return f"{{{M}}}{name}"


def mchildren(node, name):
    return [child for child in node if child.tag == mtag(name)]


def math_text(node) -> str:
    """Convert the common Word equation structures used in the textbook to TeX."""
    tag = node.tag.rsplit("}", 1)[-1]
    if tag.endswith("Pr") or tag in {"rPr", "ctrlPr"}:
        return ""
    if tag == "r":
        return "".join(node.xpath(".//m:t/text()", namespaces={"m": M}))
    if tag == "f":
        num = "".join(math_text(x) for x in mchildren(node.find(mtag("num")), "r")) if node.find(mtag("num")) is not None else ""
        den_node = node.find(mtag("den"))
        den = "".join(math_text(x) for x in den_node) if den_node is not None else ""
        num_node = node.find(mtag("num"))
        num = "".join(math_text(x) for x in num_node) if num_node is not None else ""
        return rf"\frac{{{num}}}{{{den}}}"
    if tag in {"sSub", "sSup", "sSubSup", "sPre"}:
        base = node.find(mtag("e"))
        out = "".join(math_text(x) for x in base) if base is not None else ""
        sub = node.find(mtag("sub"))
        sup = node.find(mtag("sup"))
        if sub is not None:
            out += "_{" + "".join(math_text(x) for x in sub) + "}"
        if sup is not None:
            out += "^{" + "".join(math_text(x) for x in sup) + "}"
        if tag == "sPre":
            pre_sub, pre_sup = node.find(mtag("sub")), node.find(mtag("sup"))
            if pre_sub is not None: out = "_{" + "".join(math_text(x) for x in pre_sub) + "}" + out
            if pre_sup is not None: out = "^{" + "".join(math_text(x) for x in pre_sup) + "}" + out
        return out
    if tag == "rad":
        degree, expr = node.find(mtag("deg")), node.find(mtag("e"))
        body = "".join(math_text(x) for x in expr) if expr is not None else ""
        index = "".join(math_text(x) for x in degree) if degree is not None else ""
        return rf"\sqrt[{index}]{{{body}}}" if index.strip() else rf"\sqrt{{{body}}}"
    if tag == "d":
        props = node.find(mtag("dPr"))
        begin, end = "(", ")"
        if props is not None:
            b, e = props.find(mtag("begChr")), props.find(mtag("endChr"))
            if b is not None: begin = b.get(f"{{{M}}}val", begin)
            if e is not None: end = e.get(f"{{{M}}}val", end)
        body = "".join(math_text(x) for x in node if x.tag == mtag("e"))
        return rf"\left{begin}{body}\right{end}"
    if tag == "nary":
        props = node.find(mtag("naryPr"))
        symbol = "\\sum"
        if props is not None:
            char = props.find(mtag("chr"))
            if char is not None: symbol = char.get(f"{{{M}}}val", symbol)
        sub, sup, expr = node.find(mtag("sub")), node.find(mtag("sup")), node.find(mtag("e"))
        out = symbol
        if sub is not None: out += "_{" + "".join(math_text(x) for x in sub) + "}"
        if sup is not None: out += "^{" + "".join(math_text(x) for x in sup) + "}"
        if expr is not None: out += " " + "".join(math_text(x) for x in expr)
        return out
    if tag in {"eqArr", "matrix"}:
        rows = []
        for row in node:
            if row.tag == mtag("e"):
                rows.append("".join(math_text(x) for x in row))
            elif row.tag == mtag("mr"):
                rows.append(" & ".join("".join(math_text(x) for x in cell) for cell in mchildren(row, "e")))
        if tag == "eqArr": return r"\begin{aligned}" + r" \\ ".join(rows) + r"\end{aligned}"
        return r"\begin{bmatrix}" + r" \\ ".join(rows) + r"\end{bmatrix}"
    if tag in {"limLow", "limUpp"}:
        base = node.find(mtag("e")); limit = node.find(mtag("lim"))
        op = "_" if tag == "limLow" else "^"
        return ("".join(math_text(x) for x in base) if base is not None else "") + op + "{" + ("".join(math_text(x) for x in limit) if limit is not None else "") + "}"
    if tag == "func":
        name, arg = node.find(mtag("fName")), node.find(mtag("e"))
        return ("".join(math_text(x) for x in name) if name is not None else "") + ("".join(math_text(x) for x in arg) if arg is not None else "")
    if tag == "acc":
        expr = node.find(mtag("e")); props = node.find(mtag("accPr")); char = props.find(mtag("chr")) if props is not None else None
        mark = char.get(f"{{{M}}}val", "̂") if char is not None else "̂"
        body = "".join(math_text(x) for x in expr) if expr is not None else ""
        return rf"\hat{{{body}}}" if mark in {"̂", "ˆ"} else rf"\bar{{{body}}}"
    if tag == "bar":
        expr = node.find(mtag("e")); body = "".join(math_text(x) for x in expr) if expr is not None else ""
        return rf"\overline{{{body}}}"
    return "".join(math_text(child) for child in node if not child.tag.rsplit("}", 1)[-1].endswith("Pr"))


def inline_xml(node, doc, image_ids, rel_targets):
    tag = node.tag
    if tag == mtag("oMath"):
        return "$" + math_text(node) + "$"
    if tag == mtag("oMathPara"):
        equations = [math_text(x) for x in node if x.tag == mtag("oMath")]
        return "\n\n$$\n" + "\n".join(equations) + "\n$$\n\n"
    if tag == f"{{{W}}}t": return node.text or ""
    if tag == f"{{{W}}}tab": return "    "
    if tag == f"{{{W}}}br": return "\n"
    if tag == f"{{{W}}}hyperlink":
        text = "".join(inline_xml(x, doc, image_ids, rel_targets) for x in node)
        rid = node.get(f"{{{R}}}id")
        target = rel_targets.get(rid, "")
        return f"[{text}]({target})" if target else text
    if tag == f"{{{W}}}drawing":
        blip = node.find(f".//{{{A}}}blip")
        if blip is None: return ""
        rid = blip.get(f"{{{R}}}embed")
        index = image_ids.get(blip)
        part = doc.part.related_parts.get(rid)
        if index is None or part is None: return ""
        ext = Path(str(part.partname)).suffix.lower() or ".png"
        return f"![image](media/image_{index:03d}{ext})"
    return "".join(inline_xml(child, doc, image_ids, rel_targets) for child in node)


def list_prefix(paragraph, numbering):
    ppr = paragraph._p.pPr
    numpr = ppr.numPr if ppr is not None else None
    if numpr is None or numpr.numId is None: return ""
    num = numbering.get(numpr.numId.val)
    if not num: return "- "
    level = numpr.ilvl.val if numpr.ilvl is not None else 0
    fmt = num.get(level, "bullet")
    indent = "    " * level
    return indent + ("1. " if fmt not in {"bullet", "none"} else "- ")


def table_markdown(table, doc, image_ids, rel_targets):
    rows = []
    for row in table.rows:
        cells = []
        for cell in row.cells:
            value = " ".join("".join(inline_xml(x, doc, image_ids, rel_targets) for x in p._p).strip() for p in cell.paragraphs)
            cells.append(value.replace("|", r"\|"))
        rows.append("| " + " | ".join(cells) + " |")
    if not rows: return ""
    divider = "| " + " | ".join("---" for _ in rows[0].split("| ")[1:-1]) + " |"
    return "\n".join([rows[0], divider, *rows[1:]])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("docx", type=Path)
    args = parser.parse_args()
    doc = Document(args.docx)
    body = doc.element.body
    blips = body.xpath(".//a:blip")
    image_ids = {blip: i for i, blip in enumerate(blips, 1)}
    rel_targets = {rid: rel.target_ref for rid, rel in doc.part.rels.items()}
    numbering = {}
    root = doc.part.numbering_part.element
    abstracts = {int(a.get(qn("w:abstractNumId"))): a for a in root.findall(qn("w:abstractNum"))}
    for num in root.findall(qn("w:num")):
        numid = int(num.get(qn("w:numId")))
        abstract_ref = num.find(qn("w:abstractNumId"))
        abstract = abstracts.get(int(abstract_ref.get(qn("w:val")))) if abstract_ref is not None else None
        levels = {}
        if abstract is not None:
            for lvl in abstract.findall(qn("w:lvl")):
                ilvl = int(lvl.get(qn("w:ilvl")))
                fmt = lvl.find(qn("w:numFmt"))
                levels[ilvl] = fmt.get(qn("w:val")) if fmt is not None else "bullet"
        numbering[numid] = levels

    blocks = []
    chapter = None
    section = None
    section_title = ""
    in_body = False
    seen_chapter9 = 0
    for child in body.iterchildren():
        if child.tag == qn("w:p"):
            paragraph = Paragraph(child, doc._body)
            text = paragraph.text.strip()
            style = paragraph.style.name if paragraph.style else "Normal"
            if style == "Heading 1" and text.startswith("第 "):
                match = re.match(r"第\s*(9|10|11|12)\s*章", text)
                if not match: continue
                number = int(match.group(1))
                if number == 9:
                    seen_chapter9 += 1
                    if seen_chapter9 == 1:
                        chapter, section, in_body = 9, None, True
                        blocks.append((9, None, "chapter-heading", text))
                    continue
                if not in_body: continue
                if number == 12:
                    break
                chapter, section, in_body = number, None, True
                blocks.append((chapter, None, "chapter-heading", text))
                continue
            if not in_body: continue
            heading = re.match(r"^(9|10|11)\.(\d+)\s+(.+)$", text) if style == "Heading 2" else None
            if heading:
                chapter, section = int(heading.group(1)), int(heading.group(2))
                section_title = heading.group(3).strip()
                blocks.append((chapter, section, "section-heading", section_title))
                continue
            content = "".join(inline_xml(x, doc, image_ids, rel_targets) for x in child if x.tag != qn("w:pPr")).strip()
            if not content: continue
            if style.startswith("Heading "):
                level = min(4, max(2, int(style.rsplit(" ", 1)[-1]) - 1))
                content = "#" * level + " " + content
                kind = "heading"
            elif style == "Source Code":
                content = "```python\n" + content + "\n```"
                kind = "code"
            else:
                content = list_prefix(paragraph, numbering) + content
                kind = "caption" if style == "Caption" else "text"
            blocks.append((chapter, section, kind, content))
        elif child.tag == qn("w:tbl") and in_body:
            table = Table(child, doc._body)
            blocks.append((chapter, section, "text", table_markdown(table, doc, image_ids, rel_targets)))

    pages = {}
    current = None
    preamble = []
    for chap, sec, kind, content in blocks:
        if kind == "chapter-heading":
            current = None
            continue
        if kind == "section-heading":
            if chap not in CHAPTERS or sec not in CHAPTERS[chap]: continue
            current = (chap, sec)
            title = re.sub(r"^(?:9|10|11)\.\d+\s*", "", content)
            pages[current] = [("page-title", f"# {title}")]
            if sec == 1:
                pages[current].extend(preamble)
                preamble = []
            continue
        if current is None:
            if chap in CHAPTERS:
                preamble.append((kind, content))
            continue
        pages[current].append((kind, content))

    MEDIA_OUT.mkdir(parents=True, exist_ok=True)
    for index in range(183, 322):
        source = Path(str(args.docx))
        # python-docx exposes the original media through image relationship ids.
        blip = blips[index - 1]
        rid = blip.get(f"{{{R}}}embed")
        part = doc.part.related_parts.get(rid)
        if part is None: continue
        ext = Path(str(part.partname)).suffix.lower() or ".png"
        target = MEDIA_OUT / f"image_{index:03d}{ext}"
        target.write_bytes(part.blob)

    expected = sum(len(parts) for parts in CHAPTERS.values())
    if len(pages) != expected:
        missing = [(c, s) for c, parts in CHAPTERS.items() for s in parts if (c, s) not in pages]
        raise SystemExit(f"Expected {expected} section pages, got {len(pages)}; missing {missing}")

    # A Word caption directly following an image becomes the image's accessible caption.
    for key, blocks in pages.items():
        source_page = ROOT / "content/upstream/hello-algo/docs" / CHAPTERS[key[0]][key[1]]
        source_text = source_page.read_text(encoding="utf-8")
        markers = re.findall(r"```src\s*\n(.*?)\n\s*```", source_text, flags=re.S)
        code_positions = [i for i, (kind, _) in enumerate(blocks) if kind == "code"]
        if markers and len(markers) == len(code_positions):
            for index, descriptor in zip(code_positions, markers):
                blocks[index] = ("code", "```src\n" + descriptor.strip() + "\n```")
        clean = []
        for kind, line in blocks:
            if not line.strip():
                clean.append("")
                continue
            if kind == "caption" and clean and re.search(r"!\[.*?\]\(media/image_\d+\.[^)]+\)", clean[-1]):
                match = re.search(r"!\[(.*?)\]\((.*?)\)", clean[-1])
                if match:
                    clean[-1] = f"![{line.strip()}]({match.group(2)})"
                    continue
            clean.append(line)
        # Keep multi-frame Word diagrams as the reader's existing step players.
        animated = []
        i = 0
        while i < len(clean):
            first = re.search(r"!\[(.*?)\]\((?:/genius/)?media/([^)]+)\)", clean[i])
            step = re.search(r"^图解步骤\s*(\d+)\s*/\s*(\d+)\s*[·•]\s*", first.group(1)) if first else None
            if not step or step.group(1) != "1":
                animated.append(clean[i]); i += 1; continue
            total = int(step.group(2))
            group = []
            cursor = i
            for expected in range(1, total + 1):
                while cursor < len(clean) and not clean[cursor].strip(): cursor += 1
                if cursor >= len(clean): break
                frame = re.search(r"!\[(.*?)\]\((?:/genius/)?media/([^)]+)\)", clean[cursor])
                current = re.search(r"^图解步骤\s*(\d+)\s*/\s*(\d+)\s*[·•]\s*", frame.group(1)) if frame else None
                if not current or int(current.group(1)) != expected or int(current.group(2)) != total:
                    break
                group.append((frame.group(1), "/genius/media/" + frame.group(2)))
                cursor += 1
            if len(group) != total:
                animated.append(clean[i]); i += 1; continue
            for frame_index, (caption, url) in enumerate(group, 1):
                if animated and animated[-1].strip(): animated.append("")
                animated.extend([f'=== "<{frame_index}>"', f"    ![{caption}]({url})"])
            i = cursor
        clean = animated
        path = OUT / CHAPTERS[key[0]][key[1]]
        path.parent.mkdir(parents=True, exist_ok=True)
        markdown = "\n\n".join(part for part in clean if part is not None).strip()
        markdown = markdown.replace("](media/", "](/genius/media/")
        path.write_text(markdown + "\n", encoding="utf-8", newline="\n")

    print(f"Created {len(pages)} authored pages and {len(list(MEDIA_OUT.glob('*')))} images from {blips[182:321].__len__()} embedded image occurrences.")


if __name__ == "__main__":
    main()
