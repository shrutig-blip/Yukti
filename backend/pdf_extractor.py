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

def detect_certificate_type(text: str) -> str:
    if re.search(r"GST\s*Registration\s*Certificate", text, re.IGNORECASE):
        return "gst"
    if re.search(r"Udyam\s*Registration\s*Certificate", text, re.IGNORECASE):
        return "udyam"
    if re.search(r"Permanent\s*Account\s*Number|Income\s*Tax\s*Department", text, re.IGNORECASE):
        return "pan"
    if re.search(r"Employees[’']?\s*Provident\s*Fund|EPFO", text, re.IGNORECASE):
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
    if fields.get("gstin"):
        corrected = correct_gstin_ocr_errors(fields["gstin"])
        if corrected != fields["gstin"]:
            fields["gstin_raw_ocr"] = fields["gstin"]
            fields["gstin"] = corrected
            fields["gstin_ocr_corrected"] = True
        fields["gstin_checksum_valid"] = validate_gstin_checksum(fields["gstin"])
    return fields

def extract_udyam_certificate_fields(text: str) -> dict:
    return _apply_patterns(text, {
        "enterprise_name": r"Name\s*of\s*Enterprise\s*[:\-]?\s*(.+)",
        "udyam_number": r"Udyam\s*Registration\s*Number\s*[:\-]?\s*(\S+)",
        "category": r"Category\s*[:\-]?\s*(\w+)",
        "date_of_registration": r"Date\s*of\s*Registration\s*[:\-]?\s*([\d\-]+)",
        "valid_upto": r"Valid\s*Upto\s*[:\-]?\s*([\d\-]+)",
    })

def extract_pan_certificate_fields(text: str) -> dict:
    return _apply_patterns(text, {
        "name": r"Name\s*[:\-]?\s*(.+)",
        # PAN format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F) — matched
        # directly by shape rather than a label, since PAN cards/letters don't
        # consistently print a "PAN Number:" label the way GST/Udyam certs do.
        "pan_number": r"\b([A-Z]{5}[0-9]{4}[A-Z])\b",
        "date_of_birth": r"Date\s*of\s*Birth\s*[:\-]?\s*([\d\-/]+)",
        "father_name": r"Father'?s?\s*Name\s*[:\-]?\s*(.+)",
    })

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