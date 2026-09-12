from pdf_extractor import extract_text_from_pdf, extract_certificate_fields
from data_loader import verify_certificate_against_records

samples = [
    ("BID00001", r"C:\Users\shivi\Yukti\data\sample_documents\BID00001_pan_certificate.pdf"),
    ("BID00002", r"C:\Users\shivi\Yukti\data\sample_documents\BID00002_epfo_certificate.pdf"),
    ("BID00002", r"C:\Users\shivi\Yukti\data\sample_documents\BID00002_pan_certificate_mismatch.pdf"),
    ("BID00003", r"C:\Users\shivi\Yukti\data\sample_documents\BID00003_epfo_certificate_mismatch.pdf"),
]

for bidder_id, path in samples:
    print(f"\n=== {bidder_id} — {path.split(chr(92))[-1]} ===")
    text = extract_text_from_pdf(path)
    fields = extract_certificate_fields(text)
    print("Extracted:", fields)
    result = verify_certificate_against_records(bidder_id, fields)
    print("Verification:", result)