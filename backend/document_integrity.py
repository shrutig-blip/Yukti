"""
document_integrity.py

Lightweight forged-certificate detection layered on top of the existing
PDF extraction pipeline (pdf_extractor.py). Does not replace anything —
call get_document_integrity(path) alongside extract_certificate_fields()
and merge the result into the API response.

Two signal types:
  1. Metadata anomalies  — Producer/Creator/ModDate inconsistencies
  2. Font inconsistency  — fragments of text rendered in a font/size that
     doesn't match the rest of the document (classic sign of an
     overlay/patch edit made in a PDF editor after the original export)

Both are heuristics, not proof — they lower a document_integrity score
and attach human-readable flags. The officer/AI layer decides what to
do with a low score; this module only detects and reports.
"""

from __future__ import annotations
from collections import Counter
from typing import TypedDict

import re

from pypdf import PdfReader
import pdfplumber


SUSPICIOUS_PRODUCER_KEYWORDS = [
    "word", "microsoft", "canva", "photoshop", "paint", "gimp",
    "libreoffice", "openoffice", "google docs", "pages",
]

# A genuine single-template certificate may legitimately mix a few style
# *variants* of the same typeface (regular body text, a bold heading, an
# italic disclaimer note) — that is normal design, not tampering. What's
# suspicious is a character run in a font from a completely different
# family (e.g. a monospace font dropped into a Helvetica-only template).
_SUBSET_PREFIX_RE = re.compile(r"^[A-Z]{6}\+")
_STYLE_SUFFIX_RE = re.compile(
    r"[-,]?\s*(bold|italic|oblique|regular|light|medium|semibold|black|roman|mt)",
    re.IGNORECASE,
)

ALLOWED_TEMPLATE_FAMILY_COUNT = 1
MINOR_FONT_CHAR_FLOOR = 5
MINOR_FONT_SHARE_FLOOR = 0.01


def base_font_family(fontname: str) -> str:
    """Normalize a font name to its base family, stripping any embedded-
    subset prefix (e.g. 'ABCDEF+ArialMT') and style suffixes (Bold,
    Italic, Oblique, ...) so that 'Helvetica', 'Helvetica-Bold', and
    'Helvetica-Oblique' all collapse to the same family: 'Helvetica'."""
    name = _SUBSET_PREFIX_RE.sub("", fontname)
    while True:
        stripped = _STYLE_SUFFIX_RE.sub("", name)
        if stripped == name:
            break
        name = stripped
    name = name.strip(" -,")
    return name or fontname

POINTS_PER_FLAG = 20


class IntegrityResult(TypedDict):
    score: int
    flags: list[str]


def get_pdf_metadata_flags(path: str) -> list[str]:
    """Flag PDFs whose metadata suggests re-export/editing rather than a
    direct government-portal PDF generation."""
    flags: list[str] = []
    try:
        reader = PdfReader(path)
        meta = reader.metadata or {}
    except Exception as e:
        return [f"Could not read PDF metadata: {e}"]

    producer = str(meta.get("/Producer") or "").lower()
    creator = str(meta.get("/Creator") or "").lower()

    for keyword in SUSPICIOUS_PRODUCER_KEYWORDS:
        if keyword in producer or keyword in creator:
            flags.append(
                f"Document produced/edited with '{meta.get('/Producer') or meta.get('/Creator')}' "
                "rather than a government portal PDF export"
            )
            break

    creation_date = meta.get("/CreationDate")
    mod_date = meta.get("/ModDate")
    if creation_date and mod_date and creation_date != mod_date:
        flags.append("Document was modified after its original creation date")

    return flags


def get_font_profile(path: str) -> Counter:
    """Return a Counter of (fontname, rounded size) -> character count
    across every page of the PDF."""
    fonts: Counter = Counter()
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for ch in page.chars:
                key = (ch.get("fontname", "unknown"), round(ch.get("size", 0), 1))
                fonts[key] += 1
    return fonts


def check_font_consistency(fonts: Counter) -> str | None:
    """Return a flag string if the document's font profile looks like a
    patchwork of edits rather than one consistent template render.

    Groups characters by base font *family* (Bold/Italic/Oblique variants
    of the same typeface collapse to one family, since mixing those
    within a template is normal design). The most-used family is treated
    as the template's own font; any other family that accounts for more
    than a handful of characters is treated as a likely overlay/patch."""
    total_chars = sum(fonts.values())
    if total_chars == 0:
        return None

    by_family: Counter = Counter()
    for (fontname, _size), count in fonts.items():
        by_family[base_font_family(fontname)] += count

    ranked = by_family.most_common()
    allowed = {name for name, _ in ranked[:ALLOWED_TEMPLATE_FAMILY_COUNT]}

    outliers = [
        (name, count) for name, count in ranked
        if name not in allowed
        and count > max(MINOR_FONT_CHAR_FLOOR, total_chars * MINOR_FONT_SHARE_FLOOR)
    ]

    if outliers:
        examples = ", ".join(f"{name} ({count} chars)" for name, count in outliers[:3])
        return (
            f"Unexpected font famil{'y' if len(outliers) == 1 else 'ies'} found beyond the "
            f"document's template fonts: {examples} — possible overlay or patch edit"
        )
    return None


def get_document_integrity(path: str) -> IntegrityResult:
    """Run all integrity checks on a PDF and return a score (0-100) plus
    the list of human-readable flags that reduced it."""
    flags: list[str] = []

    flags.extend(get_pdf_metadata_flags(path))

    try:
        font_flag = check_font_consistency(get_font_profile(path))
        if font_flag:
            flags.append(font_flag)
    except Exception as e:
        flags.append(f"Could not analyze font consistency: {e}")

    score = max(0, 100 - POINTS_PER_FLAG * len(flags))
    return {"score": score, "flags": flags}