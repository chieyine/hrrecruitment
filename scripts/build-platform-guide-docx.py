#!/usr/bin/env python3
"""
Build the FRAD Recruitment Platform reference guide as a Word document.

Deliberately letterhead-friendly. Every element maps to a Word **built-in**
style — Title, Heading 1-4, Body Text, Quote, Caption, Source Code, Table — and
nothing carries hard-coded colours or fonts. Dropping the FRAD letterhead
template over the document therefore restyles it wholesale, which is exactly
what you want when moving it onto official stationery.

Two consequences, both intentional:
  - the running header is left empty, so the letterhead's own header is
    unobstructed and does not have to fight a competing banner;
  - the table of contents is a live field, so it repaginates itself after the
    template is applied (right-click, Update Field).

Content is shared with the PDF build: docs/platform-guide/*.md.

Run: python3 scripts/build-platform-guide-docx.py
"""
from __future__ import annotations

import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "docs" / "platform-guide"
OUTPUT = ROOT / "docs" / "FRAD_Recruitment_Platform_Guide.docx"

PAGE_BREAK_XML = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'

TITLE_BLOCK = """---
title: "Recruitment Platform — Reference Guide"
subtitle: "FRAD Foundation"
abstract: |
  A complete description of every component of the platform: the people it
  serves, the process it enforces, the data it holds, and the controls that
  make each decision defensible.

  Specification: docs/End_to_End.md.
  Audience: HR, hiring departments, budget holders, auditors and administrators.

  This document uses Word built-in styles throughout, so applying the FRAD
  letterhead template restyles it in place. The running header is intentionally
  empty for that reason; refresh the contents list with Update Field afterwards.
lang: en-GB
---

"""


def prepare_markdown() -> str:
    """Merge the chapters and translate our few custom conventions for pandoc."""
    parts = sorted(CONTENT_DIR.glob("*.md"))
    if not parts:
        raise SystemExit(f"No markdown chapters found in {CONTENT_DIR}")

    page_break = f"```{{=openxml}}\n{PAGE_BREAK_XML}\n```"
    chapters = []

    for path in parts:
        text = path.read_text(encoding="utf-8")

        # Explicit page-break marker -> raw OOXML pandoc passes straight through.
        text = text.replace("<!--pagebreak-->", f"\n{page_break}\n")

        # `^ Figure n. ...` -> a Caption-styled paragraph.
        text = re.sub(
            r"^\^ (.+)$",
            lambda m: f'::: {{custom-style="Caption"}}\n{m.group(1)}\n:::',
            text,
            flags=re.M,
        )

        # ```note fences -> blockquote, which maps to Word's built-in Quote style.
        text = re.sub(
            r"```note\n(.*?)\n```",
            lambda m: "> " + " ".join(l.strip() for l in m.group(1).split("\n") if l.strip()),
            text,
            flags=re.S,
        )

        # Each chapter opens on a fresh page.
        if chapters:
            text = f"{page_break}\n\n{text}"
        chapters.append(text)

    return TITLE_BLOCK + "\n\n".join(chapters)


def main() -> int:
    if not shutil.which("pandoc"):
        print("pandoc is required to build the Word guide", file=sys.stderr)
        return 1

    with tempfile.TemporaryDirectory() as tmp:
        source = Path(tmp) / "guide.md"
        source.write_text(prepare_markdown(), encoding="utf-8")

        command = [
            "pandoc",
            str(source),
            "--from=markdown+pipe_tables+fenced_divs+raw_attribute+yaml_metadata_block",
            "--to=docx",
            "--standalone",
            "--toc",
            "--toc-depth=2",
            f"--output={OUTPUT}",
        ]

        # An optional committed reference document lets the organisation pin its
        # own fonts and colours without touching this script.
        reference = CONTENT_DIR / "reference.docx"
        if reference.exists():
            command.insert(-1, f"--reference-doc={reference}")

        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode != 0:
            print(result.stderr.strip(), file=sys.stderr)
            return result.returncode
        if result.stderr.strip():
            print(result.stderr.strip(), file=sys.stderr)

    print(f"Built {OUTPUT.relative_to(ROOT)} - {OUTPUT.stat().st_size/1024:.0f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
