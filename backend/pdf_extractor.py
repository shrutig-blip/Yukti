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
        from pdf2image import convert_from_path
        import pytesseract
        images = convert_from_path(pdf_path, first_page=page_index + 1, last_page=page_index + 1)
        return pytesseract.image_to_string(images[0]) if images else ""
    except Exception as e:
        print(f"[OCR skipped] page {page_index}: {e}")
        return ""


import re

def detect_certificate_type(text: str) -> str:
    if re.search(r"GST\s*Registration\s*Certificate", text, re.IGNORECASE):
        return "gst"
    if re.search(r"Udyam\s*Registration\s*Certificate", text, re.IGNORECASE):
        return "udyam"
    return "unknown"

def _apply_patterns(text: str, patterns: dict) -> dict:
    extracted = {}
    for field, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        extracted[field] = match.group(1).strip() if match else None
    return extracted

def extract_gst_certificate_fields(text: str) -> dict:
    return _apply_patterns(text, {
        "legal_name": r"Legal\s*Name\s*[:\-]?\s*(.+)",
        "gstin": r"GSTIN\s*[:\-]?\s*([A-Z0-9]+)",
        "pan": r"PAN\s*[:\-]?\s*([A-Z0-9]+)",
        "date_of_registration": r"Date\s*of\s*Registration\s*[:\-]?\s*([\d\-]+)",
        "status": r"Status\s*[:\-]?\s*(\w+)",
    })

def extract_udyam_certificate_fields(text: str) -> dict:
    return _apply_patterns(text, {
        "enterprise_name": r"Name\s*of\s*Enterprise\s*[:\-]?\s*(.+)",
        "udyam_number": r"Udyam\s*Registration\s*Number\s*[:\-]?\s*(\S+)",
        "category": r"Category\s*[:\-]?\s*(\w+)",
        "date_of_registration": r"Date\s*of\s*Registration\s*[:\-]?\s*([\d\-]+)",
        "valid_upto": r"Valid\s*Upto\s*[:\-]?\s*([\d\-]+)",
    })

def extract_certificate_fields(text: str) -> dict:
    cert_type = detect_certificate_type(text)
    if cert_type == "gst":
        return {"document_type": "gst", **extract_gst_certificate_fields(text)}
    elif cert_type == "udyam":
        return {"document_type": "udyam", **extract_udyam_certificate_fields(text)}
    return {"document_type": "unknown"}