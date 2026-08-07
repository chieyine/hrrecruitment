#!/usr/bin/env python3
"""
Build the FRAD Recruitment Platform reference guide as a PDF.

Content lives in `docs/platform-guide/*.md` so it can be reviewed and diffed as
text; this script is only the renderer. It supports the small subset of Markdown
the guide actually uses: headings, paragraphs, bullet and numbered lists, tables,
fenced code/diagram blocks, and horizontal rules.

Run: python3 scripts/build-platform-guide.py
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    CondPageBreak,
    Frame,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    Table,
    TableStyle,
)

NAVY = colors.HexColor("#071F37")
BRAND = colors.HexColor("#0B4F6C")
INK = colors.HexColor("#1C242E")
MUTED = colors.HexColor("#5A6470")
RULE = colors.HexColor("#D3D8DE")
BAND = colors.HexColor("#F1EEE7")
ACCENT = colors.HexColor("#8C6A2F")

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm
# Height available to flowables inside the body frame.
USABLE_HEIGHT = PAGE_H - 2 * MARGIN - 14 * mm

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "docs" / "platform-guide"
OUTPUT = ROOT / "docs" / "FRAD_Recruitment_Platform_Guide.pdf"


# --------------------------------------------------------------------------
# Styles
# --------------------------------------------------------------------------
def build_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    s = {}
    s["title"] = ParagraphStyle(
        "title", parent=base["Title"], fontName="Helvetica-Bold",
        fontSize=30, leading=35, textColor=colors.white, alignment=TA_LEFT, spaceAfter=0,
    )
    s["subtitle"] = ParagraphStyle(
        "subtitle", fontName="Helvetica", fontSize=12.5, leading=18,
        textColor=colors.HexColor("#C9D6E0"), alignment=TA_LEFT,
    )
    s["h1"] = ParagraphStyle(
        "h1", fontName="Helvetica-Bold", fontSize=19, leading=23,
        textColor=NAVY, spaceBefore=0, spaceAfter=10,
    )
    s["h2"] = ParagraphStyle(
        "h2", fontName="Helvetica-Bold", fontSize=13.5, leading=17,
        textColor=BRAND, spaceBefore=14, spaceAfter=6,
    )
    s["h3"] = ParagraphStyle(
        "h3", fontName="Helvetica-Bold", fontSize=11, leading=14,
        textColor=INK, spaceBefore=11, spaceAfter=4,
    )
    s["h4"] = ParagraphStyle(
        "h4", fontName="Helvetica-BoldOblique", fontSize=9.8, leading=13,
        textColor=MUTED, spaceBefore=9, spaceAfter=3,
    )
    s["body"] = ParagraphStyle(
        "body", fontName="Helvetica", fontSize=9.6, leading=14.4,
        textColor=INK, spaceAfter=7,
    )
    s["bullet"] = ParagraphStyle(
        "bullet", parent=s["body"], leftIndent=11, bulletIndent=2, spaceAfter=3.2,
    )
    s["numbered"] = ParagraphStyle(
        "numbered", parent=s["body"], leftIndent=15, bulletIndent=2, spaceAfter=3.2,
    )
    s["code"] = ParagraphStyle(
        "code", fontName="Courier", fontSize=7.7, leading=10.4, textColor=INK,
    )
    s["th"] = ParagraphStyle(
        "th", fontName="Helvetica-Bold", fontSize=8.2, leading=11, textColor=colors.white,
    )
    s["td"] = ParagraphStyle(
        "td", fontName="Helvetica", fontSize=8.2, leading=11.2, textColor=INK,
    )
    s["tdb"] = ParagraphStyle(
        "tdb", parent=s["td"], fontName="Helvetica-Bold",
    )
    s["toc1"] = ParagraphStyle(
        "toc1", fontName="Helvetica-Bold", fontSize=9.8, leading=16, textColor=NAVY,
    )
    s["toc2"] = ParagraphStyle(
        "toc2", fontName="Helvetica", fontSize=9, leading=14, textColor=MUTED, leftIndent=12,
    )
    s["note"] = ParagraphStyle(
        "note", parent=s["body"], leftIndent=9, textColor=colors.HexColor("#3A3226"),
    )
    s["caption"] = ParagraphStyle(
        "caption", fontName="Helvetica-Oblique", fontSize=8.2, leading=11,
        textColor=MUTED, spaceAfter=8,
    )
    return s


STYLES = build_styles()


# --------------------------------------------------------------------------
# Inline markdown -> reportlab markup
# --------------------------------------------------------------------------
# The built-in Type 1 fonts use WinAnsiEncoding. A character outside it renders
# as a black box, silently. These are the ones the guide is likely to attract,
# mapped to something that does render; anything else is reported by --check.
SAFE_SUBSTITUTIONS = {
    "→": "->", "←": "<-", "↔": "<->", "⇒": "=>",
    "≤": "<=", "≥": ">=", "≠": "!=", "×": "x",
    "✓": "[yes]", "✗": "[no]", "•": "-",
    "│": "|", "─": "-", "└": "+", "├": "+",
    "┌": "+", "┐": "+", "┘": "+", "┬": "+", "┴": "+",
    " ": " ", "‑": "-", "−": "-",
}

# Present in WinAnsiEncoding and safe to keep.
ALLOWED_NON_ASCII = set("§—–‘’“”…£€•°±½¼¾×÷àáâäãåçèéêëìíîïñòóôöõùúûüýÿÀÁÂÄÃÅÇÈÉÊËÌÍÎÏÑÒÓÔÖÕÙÚÛÜ")

_unsupported_found: set[str] = set()


def sanitise(text: str) -> str:
    """Replace glyphs the built-in fonts cannot draw, and record any strays."""
    for bad, good in SAFE_SUBSTITUTIONS.items():
        text = text.replace(bad, good)
    for ch in text:
        if ord(ch) > 127 and ch not in ALLOWED_NON_ASCII:
            _unsupported_found.add(ch)
    return text


def inline(text: str) -> str:
    """Convert the inline Markdown the guide uses into reportlab tags."""
    text = sanitise(text)
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # Code spans first, so emphasis inside them is left alone.
    text = re.sub(
        r"`([^`]+)`",
        lambda m: f'<font face="Courier" size="8.4" color="#0B4F6C">{m.group(1)}</font>',
        text,
    )
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<i>\1</i>", text)
    # Unicode arrows and dashes render fine in Helvetica; box-drawing does not.
    return text


# --------------------------------------------------------------------------
# Document template with running headers, footers and an outline
# --------------------------------------------------------------------------
class Guide(BaseDocTemplate):
    def __init__(self, path: str, **kw):
        super().__init__(path, pagesize=A4, **kw)
        self.chapter = ""
        self.toc_entries: list[tuple[int, str, int]] = []

        frame = Frame(
            MARGIN, MARGIN + 8 * mm,
            PAGE_W - 2 * MARGIN, PAGE_H - 2 * MARGIN - 14 * mm,
            id="body", showBoundary=0,
        )
        cover = Frame(0, 0, PAGE_W, PAGE_H, id="cover", showBoundary=0,
                      leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([
            PageTemplate(id="cover", frames=[cover], onPage=self.draw_cover),
            PageTemplate(id="body", frames=[frame], onPage=self.draw_chrome),
        ])

    # Cover page furniture is drawn directly rather than flowed.
    def draw_cover(self, canvas, doc):
        canvas.saveState()
        canvas.setFillColor(NAVY)
        canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        canvas.setFillColor(ACCENT)
        canvas.rect(0, PAGE_H - 250, 6 * mm, 250, fill=1, stroke=0)
        canvas.restoreState()

    def draw_chrome(self, canvas, doc):
        canvas.saveState()
        # Header
        canvas.setFillColor(NAVY)
        canvas.rect(0, PAGE_H - 13 * mm, PAGE_W, 13 * mm, fill=1, stroke=0)
        canvas.setFont("Helvetica-Bold", 7.6)
        canvas.setFillColor(colors.white)
        canvas.drawString(MARGIN, PAGE_H - 8.6 * mm, "FRAD RECRUITMENT PLATFORM")
        canvas.setFont("Helvetica", 7.6)
        canvas.setFillColor(colors.HexColor("#9FB4C6"))
        chapter = (self.chapter or "")[:74]
        canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 8.6 * mm, chapter)
        # Footer
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN, 14 * mm, PAGE_W - MARGIN, 14 * mm)
        canvas.setFont("Helvetica", 7.2)
        canvas.setFillColor(MUTED)
        canvas.drawString(MARGIN, 10 * mm, "Internal reference — confidential")
        canvas.drawRightString(PAGE_W - MARGIN, 10 * mm, f"Page {doc.page - 1}")
        canvas.restoreState()

    def afterFlowable(self, flowable):
        """Collect headings for the contents list and the PDF outline."""
        if not hasattr(flowable, "_guide_level"):
            return
        level = flowable._guide_level
        text = flowable._guide_text
        if level == 1:
            self.chapter = text
        self.toc_entries.append((level, text, self.page - 1))
        key = f"h{len(self.toc_entries)}"
        self.canv.bookmarkPage(key)
        self.canv.addOutlineEntry(text[:110], key, level=min(level - 1, 2), closed=(level > 1))


def heading(text: str, level: int):
    style = STYLES[f"h{min(level, 4)}"]
    para = Paragraph(inline(text), style)
    para._guide_level = level
    para._guide_text = re.sub(r"<[^>]+>", "", text)
    return para


# --------------------------------------------------------------------------
# Block parsing
# --------------------------------------------------------------------------
def make_table(rows: list[list[str]]) -> Table:
    header, *body = rows
    ncols = len(header)
    avail = PAGE_W - 2 * MARGIN

    # Weight columns by the longest cell so a narrow key column does not get
    # the same width as a prose column.
    weights = []
    for i in range(ncols):
        longest = max([len(header[i])] + [len(r[i]) if i < len(r) else 0 for r in body] or [1])
        weights.append(max(longest, 6))
    total = sum(weights)
    widths = [max(avail * w / total, 20 * mm) for w in weights]
    # Rescale if the minimums pushed it over the page.
    scale = avail / sum(widths)
    widths = [w * scale for w in widths]

    data = [[Paragraph(inline(c), STYLES["th"]) for c in header]]
    for r in body:
        cells = []
        for i in range(ncols):
            raw = r[i] if i < len(r) else ""
            cells.append(Paragraph(inline(raw), STYLES["tdb"] if i == 0 and ncols > 2 else STYLES["td"]))
        data.append(cells)

    t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, RULE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAF8F4")]),
        ("BOX", (0, 0), (-1, -1), 0.6, RULE),
    ]))
    return t


def code_block(lines: list[str]) -> Table:
    # Diagrams are drawn with ASCII rather than box-drawing characters for the
    # same encoding reason; sanitise catches anything that slipped through.
    text = sanitise("\n".join(lines)) or " "
    inner = Preformatted(text, STYLES["code"])
    t = Table([[inner]], colWidths=[PAGE_W - 2 * MARGIN], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F6F4EF")),
        ("BOX", (0, 0), (-1, -1), 0.5, RULE),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return t


def callout(lines: list[str]) -> Table:
    body = [Paragraph(inline(l), STYLES["note"]) for l in lines if l.strip()]
    t = Table([[body]], colWidths=[PAGE_W - 2 * MARGIN], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BAND),
        ("LINEBEFORE", (0, 0), (0, -1), 2.4, ACCENT),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def split_row(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def parse_markdown(md: str, first_chapter: bool = False) -> list:
    """`first_chapter` suppresses the leading page break, which the cover already emitted."""
    story: list = []
    pending_chapter_break = not first_chapter
    lines = md.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        # Page break marker
        if stripped == "<!--pagebreak-->":
            story.append(PageBreak())
            i += 1
            continue

        # Fenced block
        if stripped.startswith("```"):
            fence = stripped[3:].strip()
            i += 1
            buf = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                buf.append(lines[i])
                i += 1
            i += 1
            block = callout(buf) if fence == "note" else code_block(buf)
            # A heading immediately above a diagram must not be orphaned at the
            # foot of a page. Estimate the pair's height and keep them together
            # whenever they can share a page at all.
            est = len(buf) * STYLES["code"].leading + 14 + 34
            if (
                story
                and hasattr(story[-1], "_guide_level")
                and story[-1]._guide_level >= 2
                and est < USABLE_HEIGHT
            ):
                story.append(KeepTogether([story.pop(), block]))
            else:
                story.append(block)
            story.append(Spacer(1, 8))
            continue

        # Heading
        m = re.match(r"^(#{1,4})\s+(.*)$", stripped)
        if m:
            level = len(m.group(1))
            if level == 1:
                if pending_chapter_break:
                    story.append(PageBreak())
                pending_chapter_break = True
                story.append(heading(m.group(2), 1))
                story.append(Spacer(1, 2))
                rule = Table([[""]], colWidths=[PAGE_W - 2 * MARGIN], rowHeights=[2])
                rule.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), ACCENT)]))
                story.append(rule)
                story.append(Spacer(1, 12))
            else:
                story.append(CondPageBreak(28 * mm))
                story.append(heading(m.group(2), level))
            i += 1
            continue

        # Horizontal rule
        if re.match(r"^---+$", stripped):
            story.append(Spacer(1, 4))
            rule = Table([[""]], colWidths=[PAGE_W - 2 * MARGIN], rowHeights=[0.6])
            rule.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), RULE)]))
            story.append(rule)
            story.append(Spacer(1, 8))
            i += 1
            continue

        # Table
        if stripped.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s:|-]+\|$", lines[i + 1].strip()):
            rows = [split_row(stripped)]
            i += 2
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append(split_row(lines[i].strip()))
                i += 1
            table = make_table(rows)
            # Same reasoning as diagrams. Rows wrap, so this is a lower bound —
            # a long table simply flows and repeats its header instead.
            if (
                story
                and hasattr(story[-1], "_guide_level")
                and story[-1]._guide_level >= 2
                and len(rows) * 26 + 34 < USABLE_HEIGHT * 0.7
            ):
                story.append(KeepTogether([story.pop(), table]))
            else:
                story.append(table)
            story.append(Spacer(1, 10))
            continue

        # Bullet list
        if re.match(r"^[-*]\s+", stripped):
            items = []
            while i < len(lines) and re.match(r"^[-*]\s+", lines[i].strip()):
                items.append(re.sub(r"^[-*]\s+", "", lines[i].strip()))
                i += 1
            for it in items:
                story.append(Paragraph(inline(it), STYLES["bullet"], bulletText="•"))
            story.append(Spacer(1, 6))
            continue

        # Numbered list
        if re.match(r"^\d+\.\s+", stripped):
            n = 0
            while i < len(lines) and re.match(r"^\d+\.\s+", lines[i].strip()):
                n += 1
                text = re.sub(r"^\d+\.\s+", "", lines[i].strip())
                story.append(Paragraph(inline(text), STYLES["numbered"], bulletText=f"{n}."))
                i += 1
            story.append(Spacer(1, 6))
            continue

        # Caption
        if stripped.startswith("^ "):
            story.append(Paragraph(inline(stripped[2:]), STYLES["caption"]))
            i += 1
            continue

        # Paragraph
        buf = []
        while i < len(lines) and lines[i].strip() and not re.match(
            r"^(#{1,4}\s|[-*]\s|\d+\.\s|\||```|---+$|\^ |<!--)", lines[i].strip()
        ):
            buf.append(lines[i].strip())
            i += 1
        if buf:
            story.append(Paragraph(inline(" ".join(buf)), STYLES["body"]))
    return story


def cover_story() -> list:
    def white(text, size, leading, colour=colors.white, font="Helvetica-Bold"):
        return Paragraph(
            text,
            ParagraphStyle("c", fontName=font, fontSize=size, leading=leading, textColor=colour),
        )

    return [
        Spacer(1, 78 * mm),
        Table(
            [[[
                white("FRAD Foundation", 12, 16, colors.HexColor("#C8A45E")),
                Spacer(1, 10),
                white("Recruitment Platform", 32, 37),
                white("Reference Guide", 32, 37),
                Spacer(1, 14),
                white(
                    "A complete description of every component of the platform: "
                    "the people it serves, the process it enforces, the data it holds, "
                    "and the controls that make each decision defensible.",
                    11.5, 17, colors.HexColor("#AFC3D4"), "Helvetica",
                ),
            ]]],
            colWidths=[PAGE_W - 2 * MARGIN - 6 * mm],
            hAlign="LEFT",
            style=TableStyle([
                ("LEFTPADDING", (0, 0), (-1, -1), MARGIN),
                ("RIGHTPADDING", (0, 0), (-1, -1), MARGIN),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]),
        ),
        Spacer(1, 62 * mm),
        Table(
            [[[
                white("Specification", 8, 12, colors.HexColor("#7E97AC"), "Helvetica"),
                white("docs/End_to_End.md", 10, 15, colors.white, "Helvetica-Bold"),
                Spacer(1, 8),
                white("Audience", 8, 12, colors.HexColor("#7E97AC"), "Helvetica"),
                white("HR, hiring departments, budget holders, auditors, administrators", 10, 15,
                      colors.white, "Helvetica-Bold"),
            ]]],
            colWidths=[PAGE_W - 2 * MARGIN],
            hAlign="LEFT",
            style=TableStyle([
                ("LEFTPADDING", (0, 0), (-1, -1), MARGIN),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
            ]),
        ),
        NextPageTemplate("body"),
        PageBreak(),
    ]


def main() -> int:
    if not CONTENT_DIR.exists():
        print(f"Content directory missing: {CONTENT_DIR}", file=sys.stderr)
        return 1

    parts = sorted(CONTENT_DIR.glob("*.md"))
    if not parts:
        print("No markdown chapters found.", file=sys.stderr)
        return 1

    story = cover_story()
    for index, path in enumerate(parts):
        story.extend(parse_markdown(path.read_text(encoding="utf-8"), first_chapter=(index == 0)))

    doc = Guide(
        str(OUTPUT),
        title="FRAD Recruitment Platform — Reference Guide",
        author="FRAD Foundation",
        subject="Complete platform reference",
        leftMargin=MARGIN, rightMargin=MARGIN, topMargin=MARGIN, bottomMargin=MARGIN,
    )
    doc.build(story)

    if _unsupported_found:
        # A black box in a printed reference guide is worse than a failed build.
        print(
            "Unsupported glyphs would render as black boxes: "
            + " ".join(f"{ch!r}(U+{ord(ch):04X})" for ch in sorted(_unsupported_found)),
            file=sys.stderr,
        )
        return 2

    size = os.path.getsize(OUTPUT)
    print(f"Built {OUTPUT.relative_to(ROOT)} — {size/1024:.0f} KB, {len(parts)} chapters, {doc.page - 1} pages")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
