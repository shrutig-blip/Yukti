from pdf_extractor import _try_ocr_page

samples = [
    r"C:\Users\shivi\Yukti\data\sample_documents\BID00001_gst_certificate.pdf",
    r"C:\Users\shivi\Yukti\data\sample_documents\BID00002_udyam_certificate.pdf",
    r"C:\Users\shivi\Yukti\data\sample_documents\BID00003_gst_certificate.pdf",
]

for path in samples:
    print(f"\n=== {path} ===")
    result = _try_ocr_page(path, 0)
    print("---OCR OUTPUT---")
    print(result if result.strip() else "(empty — OCR didn't extract anything)")
    print("---END---")