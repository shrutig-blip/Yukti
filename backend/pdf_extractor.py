import pdfplumber

MIN_CHARS_PER_PAGE = 30

def extract_text_from_pdf(pdf_path: str) -> str:
    page_texts = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            if len(text.strip()) < MIN_CHARS_PER_PAGE:
                text = _try_ocr_page(pdf_path, i)
            page_texts.append(text)
    return "\n".join(page_texts)


def _try_ocr_page(pdf_path: str, page_index: int) -> str:
    """OCR fallback — returns empty string if OCR isn't set up on this machine."""
    try:
        import pymupdf as fitz  # PyMuPDF
        import pytesseract
        from PIL import Image
        import io

        doc = fitz.open(pdf_path)
        if page_index >= len(doc):
            doc.close()
            return ""

        page = doc[page_index]
        zoom = 300 / 72  # target 300 DPI (pytesseract works best at 300 DPI)
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("png")
        doc.close()

        image = Image.open(io.BytesIO(img_bytes))
        return pytesseract.image_to_string(image)
    except Exception as e:
        print(f"[OCR skipped] page {page_index}: {e}")
        return ""


import re

# --- Certificate type detection --------------------------------------------
#
# Previous version required one exact adjacent phrase ("GST Registration
# Certificate", "Udyam Registration Certificate"). Real certificates vary in
# title wording ("Certificate of Registration", "Registration Certificate
# for GST", the title split across lines with a logo/QR code in between,
# etc.), so a single exact-phrase match was too brittle and returned
# "unknown" for genuine certificates.
#
# This version checks several independent signals per type — a strict data
# format (GSTIN shape, Udyam number shape, PAN shape) OR a looser keyword —
# and returns the first type with any signal present. GST is checked before
# PAN because a GSTIN embeds a PAN-shaped substring inside it (positions
# 2-11), so checking GST first avoids a GST certificate being misdetected
# as a PAN document.

# GSTIN: 2-digit state code + 10-char PAN + 1 entity code + 'Z' + 1 checksum
_GSTIN_SHAPE_RE = re.compile(r"\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b")
# PAN: 5 letters, 4 digits, 1 letter
_PAN_SHAPE_RE = re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b")
# Udyam number: e.g. UDYAM-DL-01-1234567
_UDYAM_SHAPE_RE = re.compile(r"\bUDYAM-[A-Z]{2}-\d{2}-\d{7}\b", re.IGNORECASE)


def detect_certificate_type(text: str) -> str:
    text = text or ""

    if (
        _GSTIN_SHAPE_RE.search(text)
        or re.search(r"\bGSTIN\b", text, re.IGNORECASE)
        or re.search(r"GST\s*Registration\s*Certificate", text, re.IGNORECASE)
        or re.search(r"Goods\s+and\s+Services\s+Tax", text, re.IGNORECASE)
    ):
        return "gst"

    if (
        _UDYAM_SHAPE_RE.search(text)
        or re.search(r"Udyam\s*Registration", text, re.IGNORECASE)
        or re.search(r"Udyam\s*(?:Registration\s*)?Number", text, re.IGNORECASE)
    ):
        return "udyam"

    if (
        _PAN_SHAPE_RE.search(text)
        or re.search(r"Permanent\s*Account\s*Number|Income\s*Tax\s*Department", text, re.IGNORECASE)
    ):
        return "pan"

    if re.search(r"Employees[’']?\s*Provident\s*Fund|EPFO|Establishment\s*Code", text, re.IGNORECASE):
        return "epfo"

    return "unknown"


def _apply_patterns(text: str, patterns: dict) -> dict:
    extracted = {}
    for field, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        extracted[field] = match.group(1).strip() if match else None
    return extracted

# Common Tesseract OCR confusions between visually similar digit/letter pairs.
# GSTIN has a fixed 15-character layout with known digit-only and
# letter-only positions, so a mismatch at a fixed position is very likely
# an OCR misread, not a data error — safe to auto-correct here.
_OCR_LETTER_TO_DIGIT = {"O": "0", "I": "1", "L": "1", "S": "5", "B": "8", "Z": "2", "G": "6"}
_OCR_DIGIT_TO_LETTER = {v: k for k, v in _OCR_LETTER_TO_DIGIT.items()}
_GSTIN_DIGIT_POSITIONS = {0, 1, 7, 8, 9, 10, 12}
_GSTIN_LETTER_POSITIONS = {2, 3, 4, 5, 6, 11, 13}

def correct_gstin_ocr_errors(gstin: str) -> str:
    """Fixes likely OCR misreads in a GSTIN by checking each character
    against what type (digit/letter) that position is required to be.
    Only touches characters that are wrong for their position."""
    if not gstin or len(gstin) != 15:
        return gstin
    chars = list(gstin.upper())
    for pos in _GSTIN_DIGIT_POSITIONS:
        c = chars[pos]
        if not c.isdigit() and c in _OCR_LETTER_TO_DIGIT:
            chars[pos] = _OCR_LETTER_TO_DIGIT[c]
    for pos in _GSTIN_LETTER_POSITIONS:
        c = chars[pos]
        if c.isdigit() and c in _OCR_DIGIT_TO_LETTER:
            chars[pos] = _OCR_DIGIT_TO_LETTER[c]
    return "".join(chars)

_GSTIN_CODE_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def validate_gstin_checksum(gstin: str) -> bool:
    """Validates the GSTIN's 15th character against the standard
    checksum algorithm (base-36 weighted sum). Returns False for any
    GSTIN that is mathematically invalid, even if its format looks
    right — this catches fabricated/garbled numbers that a plain
    format check would miss."""
    if not gstin or len(gstin) != 15:
        return False
    factor = 1
    total = 0
    mod = 36
    try:
        for char in gstin[:-1]:
            code_point = _GSTIN_CODE_CHARS.index(char)
            digit = factor * code_point
            digit = (digit // mod) + (digit % mod)
            total += digit
            factor = 2 if factor == 1 else 1
        checksum = (mod - (total % mod)) % mod
        return _GSTIN_CODE_CHARS[checksum] == gstin[-1]
    except ValueError:
        return False

def extract_gst_certificate_fields(text: str) -> dict:
    fields = _apply_patterns(text, {
        "legal_name": r"Legal\s*Name\s*[:\-]?\s*(.+)",
        "gstin": r"GSTIN\s*[:\-]?\s*([A-Z0-9]+)",
        "pan": r"PAN\s*[:\-]?\s*([A-Z0-9]+)",
        "date_of_registration": r"Date\s*of\s*Registration\s*[:\-]?\s*([\d\-]+)",
        "status": r"Status\s*[:\-]?\s*(\w+)",
    })
    # Fallback: if there was no "GSTIN:" label but the GSTIN shape appears
    # bare in the text, grab it directly rather than leaving the field null.
    if not fields.get("gstin"):
        shape_match = _GSTIN_SHAPE_RE.search(text)
        if shape_match:
            fields["gstin"] = shape_match.group(0)
    if fields.get("gstin"):
        corrected = correct_gstin_ocr_errors(fields["gstin"])
        if corrected != fields["gstin"]:
            fields["gstin_raw_ocr"] = fields["gstin"]
            fields["gstin"] = corrected
            fields["gstin_ocr_corrected"] = True
        fields["gstin_checksum_valid"] = validate_gstin_checksum(fields["gstin"])
    return fields

def extract_udyam_certificate_fields(text: str) -> dict:
    fields = _apply_patterns(text, {
        "enterprise_name": r"Name\s*of\s*Enterprise\s*[:\-]?\s*(.+)",
        "udyam_number": r"Udyam\s*Registration\s*Number\s*[:\-]?\s*(\S+)",
        "category": r"Category\s*[:\-]?\s*(\w+)",
        "date_of_registration": r"Date\s*of\s*Registration\s*[:\-]?\s*([\d\-]+)",
        "valid_upto": r"Valid\s*Upto\s*[:\-]?\s*([\d\-]+)",
    })
    if not fields.get("udyam_number"):
        shape_match = _UDYAM_SHAPE_RE.search(text)
        if shape_match:
            fields["udyam_number"] = shape_match.group(0)
    return fields

_DOB_RE = re.compile(r"\d{4}-\d{2}-\d{2}|\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4}")


def _next_real_value(lines, start_idx: int, min_letters: int = 2, max_lookahead: int = 4):
    """Scans forward from start_idx and returns the first chunk of text that
    looks like a genuine value (>= min_letters consecutive letters), skipping
    blank lines and single-character OCR noise (e.g. a stray misread "f" or
    "[a]" from a photo border) rather than grabbing whatever non-whitespace
    token happens to sit right after a label."""
    for j in range(start_idx, min(start_idx + max_lookahead, len(lines))):
        candidate = re.sub(r"[\[\]|]", " ", lines[j].strip())
        candidate = re.sub(r"\s{2,}", " ", candidate).strip()
        # drop isolated single-letter tokens (common OCR artifact noise)
        candidate = re.sub(r"(^|\s)[A-Za-z](\s|$)", " ", candidate).strip()
        if re.search(rf"[A-Za-z]{{{min_letters},}}", candidate):
            return candidate
    return None


def extract_pan_certificate_fields(text: str) -> dict:
    # PAN CARDS ARE LINE-STRUCTURED, NOT "Label: Value" ON ONE LINE.
    #
    # On real (scanned/photographed) PAN cards, the bilingual label sits on
    # its own line and the actual value is on the line(s) that follow — e.g.
    #   "नाम / Name"
    #   "APPLICANT NAME"
    # A single regex like r"Name\s*[:\-]?\s*(.+)" relies on \s* eating the
    # newline to reach the next line's value, but real OCR output on photos
    # very often has a stray misread character trailing the label on its OWN
    # line (e.g. "नाम / Name f" — a border/artifact misread) — that trailing
    # junk gets captured instead of the real value one line down.
    #
    # This walks the text line by line so it can skip that kind of noise and
    # find the actual value line, while still handling clean single-line
    # "Name: XYZ" text (typed certificates / text-layer PDFs) via the same
    # same-line-first lookup.
    lines = text.splitlines()
    result = {"name": None, "father_name": None, "date_of_birth": None, "pan_number": None}

    # PAN format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F) — matched
    # directly by shape rather than a label, since PAN cards/letters don't
    # consistently print a "PAN Number:" label the way GST/Udyam certs do.
    pan_match = _PAN_SHAPE_RE.search(text)
    if pan_match:
        result["pan_number"] = pan_match.group(0)

    for i, line in enumerate(lines):
        if result["father_name"] is None and re.search(r"Father'?s?\s*Name", line, re.IGNORECASE):
            after_label = re.split(r"Father'?s?\s*Name\s*[:\-]?", line, flags=re.IGNORECASE, maxsplit=1)[-1]
            result["father_name"] = _next_real_value([after_label], 0) or _next_real_value(lines, i + 1)
            continue
        # \bName\b would also match inside a "Father's Name" line, so this
        # only runs once father_name's own check above has had first claim
        # on that line (via `continue`), and only if "name" isn't set yet.
        if result["name"] is None and re.search(r"\bName\b", line, re.IGNORECASE):
            after_label = re.split(r"Name\s*[:\-]?", line, flags=re.IGNORECASE, maxsplit=1)[-1]
            result["name"] = _next_real_value([after_label], 0) or _next_real_value(lines, i + 1)
            continue
        if result["date_of_birth"] is None and re.search(r"Date\s*of\s*Birth", line, re.IGNORECASE):
            dob_match = _DOB_RE.search(line)
            if not dob_match:
                for j in range(i + 1, min(i + 3, len(lines))):
                    dob_match = _DOB_RE.search(lines[j])
                    if dob_match:
                        break
            result["date_of_birth"] = dob_match.group(0) if dob_match else None

    return result

def extract_epfo_certificate_fields(text: str) -> dict:
    return _apply_patterns(text, {
        "establishment_name": r"(?:Name\s*of\s*Establishment|Establishment\s*Name)\s*[:\-]?\s*(.+)",
        "establishment_code": r"(?:Establishment\s*Code(?:\s*Number)?|Code\s*Number)\s*[:\-]?\s*(\S+)",
        "date_of_registration": r"Date\s*of\s*Registration\s*[:\-]?\s*([\d\-]+)",
    })

def extract_certificate_fields(text: str) -> dict:
    cert_type = detect_certificate_type(text)
    if cert_type == "gst":
        return {"document_type": "gst", **extract_gst_certificate_fields(text)}
    elif cert_type == "udyam":
        return {"document_type": "udyam", **extract_udyam_certificate_fields(text)}
    elif cert_type == "pan":
        return {"document_type": "pan", **extract_pan_certificate_fields(text)}
    elif cert_type == "epfo":
        return {"document_type": "epfo", **extract_epfo_certificate_fields(text)}
    return {"document_type": "unknown"}

def extract_nit_requirements(text: str) -> dict:
    fields = _apply_patterns(text, {
        "tender_title": r"(?:Tender\s*Title|Name\s*of\s*Work|Subject)\s*[:\-]?\s*(.+)",
        "tender_id": r"(?:Tender\s*(?:Reference\s*)?(?:No\.?|Number|ID))\s*[:\-]?\s*(\S+)",
        "min_turnover_cr": r"(?:Minimum\s*)?(?:Annual\s*)?Turnover\s*[:\-]?\s*(?:Rs\.?|₹)?\s*([\d.]+)\s*(?:Cr|Crore|Lakh)?",
        "min_local_content_percent": r"Local\s*Content\s*[:\-]?\s*([\d.]+)\s*%",
        "category_allowed": r"(?:Category|Eligible\s*Category)\s*(?:Allowed)?\s*[:\-]\s*(.+)",
        "submission_deadline": r"(?:Submission|Bid)\s*Deadline\s*[:\-]?\s*([\d\-/:\s]+)",
        "estimated_value_cr": r"Estimated\s*(?:Tender\s*)?Value\s*[:\-]?\s*(?:Rs\.?|₹)?\s*([\d.]+)\s*(?:Cr|Crore)?",
    })

    def _sentence_around(match):
        """Full sentence containing the match (nearest '.' before/after) —
        catches negation whether it comes before the phrase ("not restricted
        to MSME") or after it ("Startup relaxation is not applicable")."""
        start = text.rfind(".", 0, match.start()) + 1
        end_dot = text.find(".", match.end())
        end = end_dot if end_dot != -1 else len(text)
        return text[start:end]

    _msme_hit = re.search(r"MSME\s*only|restricted\s*to\s*MSME", text, re.IGNORECASE)
    if _msme_hit:
        sentence = _sentence_around(_msme_hit)
        negated = bool(re.search(r"\b(not|no|non)\b", sentence, re.IGNORECASE))
        fields["msme_only"] = not negated
    else:
        fields["msme_only"] = False

    _startup_hit = re.search(r"startup\s*relaxation|DPIIT\s*recognized\s*startup", text, re.IGNORECASE)
    if _startup_hit:
        sentence = _sentence_around(_startup_hit)
        negated = bool(re.search(r"\b(not|no|non)\b", sentence, re.IGNORECASE))
        fields["startup_relaxation"] = not negated
    else:
        fields["startup_relaxation"] = False

    return fields


# ---------------------------------------------------------------------------
# Document integrity analysis (real, metadata/structure-based — not ML)
# ---------------------------------------------------------------------------
# HONESTY NOTE: this is NOT a forgery-detection model and does not claim to
# "prove" a document is fake. It surfaces genuinely-observable structural and
# metadata signals — the same category of check used by real PDF-forensics
# tools (e.g. checking CreationDate vs ModDate drift, producer software, and
# incremental-save/xref-repair markers is standard practice in tools like
# pdfchecker/pdfid). Every flag below is something a person could verify
# themselves by inspecting the raw PDF bytes — nothing here is inferred by a
# trained model or guessed.
#
# Design principle carried over from verify_bidder_credentials(): missing
# metadata is NOT treated as suspicious. Many legitimate government-portal
# PDFs strip metadata entirely — absence of a signal produces no flag, only
# a *positive, present* signal (e.g. a large date gap, a repaired xref
# table) produces one. This avoids penalizing clean documents that simply
# lack rich metadata.

from datetime import datetime as _datetime

_PDF_DATE_RE = re.compile(
    r"D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?"
)

def _parse_pdf_date(value):
    """Parses PDF date strings like 'D:20260601120000+05'30''. Returns None
    (not an error) for missing/unparseable dates — see honesty note above."""
    if not value:
        return None
    match = _PDF_DATE_RE.search(str(value))
    if not match:
        return None
    year, month, day, hour, minute, second = match.groups()
    try:
        return _datetime(
            int(year), int(month), int(day),
            int(hour or 0), int(minute or 0), int(second or 0),
        )
    except ValueError:
        return None


# Software commonly used to EDIT an already-issued PDF (as opposed to
# software that GENERATES one from a government portal template). Presence
# of one of these in Producer/Creator is a real, checkable signal that the
# file passed through a general-purpose editor after its original creation —
# not proof of tampering by itself, but worth an officer's attention.
_SUSPICIOUS_EDITOR_KEYWORDS = [
    "photoshop", "illustrator", "gimp", "paint.net", "snagit",
    "pdf-xchange editor", "foxit phantompdf editor", "nitro pro",
    "ilovepdf", "smallpdf", "sejda", "canva",
]

# Fonts beyond this count on a single page is unusual for a template-
# generated single-issuer certificate (most use 1-2 fonts throughout).
_MAX_EXPECTED_FONTS_PER_PAGE = 3
# Pages with fewer real characters than this are likely scanned images —
# font analysis on them would be meaningless, so they're skipped rather
# than flagged.
_MIN_CHARS_FOR_FONT_CHECK = 20


def analyze_document_integrity(pdf_path: str) -> dict:
    """Real, metadata/structure-based integrity signals for an uploaded
    certificate PDF. Returns {"score": int 0-100, "flags": [str, ...]} —
    matches the shape documentService.ts already expects from
    result.document_integrity, so no frontend changes are needed to
    consume this once wired into the /verify/{bidder_id}/certificate route.

    score starts at 100 and is reduced for each independently-verifiable
    signal found. A clean document with no metadata at all still scores
    100 — absence of metadata is never itself a deduction (see module note).
    """
    flags = []
    score = 100

    # --- Metadata: CreationDate vs ModDate drift + producer/creator check ---
    try:
        with pdfplumber.open(pdf_path) as pdf:
            meta = pdf.metadata or {}
    except Exception:
        meta = {}

    created = _parse_pdf_date(meta.get("CreationDate"))
    modified = _parse_pdf_date(meta.get("ModDate"))
    if created and modified and modified > created:
        gap_days = (modified - created).days
        if gap_days >= 1:
            flags.append(
                f"Document was modified {gap_days} day(s) after creation "
                f"(Created: {created.date()}, Modified: {modified.date()})."
            )
            score -= 35 if gap_days >= 30 else 20

    producer = f"{meta.get('Producer', '')} {meta.get('Creator', '')}".lower()
    matched_editor = next((kw for kw in _SUSPICIOUS_EDITOR_KEYWORDS if kw in producer), None)
    if matched_editor:
        flags.append(
            f"Document metadata indicates it was processed with '{matched_editor}', "
            "a general-purpose editing tool not typically used to issue official certificates."
        )
        score -= 25

    # --- Structural: incremental updates (edited after being finalized) ---
    # A PDF gets one "%%EOF" marker per save. More than one means the file
    # was saved, then re-opened and saved again — i.e. edited after its
    # first finalized version. This is a raw byte-level fact, not an
    # inference — no library needed beyond reading the file.
    try:
        with open(pdf_path, "rb") as f:
            raw = f.read()
        eof_count = raw.count(b"%%EOF")
        if eof_count > 1:
            extra_saves = eof_count - 1
            flags.append(
                f"Document contains {extra_saves} incremental update(s) after its "
                "initial save — the file was re-saved/edited after being finalized."
            )
            score -= min(30, extra_saves * 10)
    except Exception:
        pass

    # --- Structural: MuPDF-detected xref repair ---
    # MuPDF silently repairs a broken/corrupted cross-reference table when
    # opening a malformed PDF, and records that it had to do so. A PDF
    # needing xref repair is a genuine structural-integrity red flag —
    # normal, untampered PDFs never trigger this.
    try:
        import pymupdf as fitz
        fitz.TOOLS.mupdf_warnings()  # clear any stale buffer first
        doc = fitz.open(pdf_path)
        doc.close()
        warnings = fitz.TOOLS.mupdf_warnings()
        if warnings and ("repair" in warnings.lower() or "broken xref" in warnings.lower()):
            flags.append(
                "PDF structure required repair to open (broken/corrupted cross-reference table) — "
                "a strong indicator of file corruption or low-level tampering."
            )
            score -= 35
    except Exception:
        pass

    # --- Font consistency ---
    # Government-portal-generated certificates are template PDFs and
    # normally use 1-2 fonts throughout. A page with unusually many distinct
    # fonts often means a field (like a date or name) was pasted in from a
    # different source. Pages with very little real text (likely scanned
    # images) are skipped — font analysis is meaningless there.
    try:
        flagged_pages = []
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                chars = page.chars
                if len(chars) < _MIN_CHARS_FOR_FONT_CHECK:
                    continue
                fonts = {c["fontname"] for c in chars if c.get("fontname")}
                if len(fonts) > _MAX_EXPECTED_FONTS_PER_PAGE:
                    flagged_pages.append((i, sorted(fonts)))
        if flagged_pages:
            page_desc = "; ".join(f"page {p} uses {len(f)} fonts" for p, f in flagged_pages)
            flags.append(f"Unusually high font variety detected — {page_desc}.")
            score -= 15
    except Exception:
        pass

    score = max(0, min(100, score))
    return {"score": score, "flags": flags}