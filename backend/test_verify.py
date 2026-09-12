from pdf_extractor import extract_text_from_pdf, extract_certificate_fields
from data_loader import verify_certificate_against_records

samples = [
    ("BID00002", r"C:\Users\shivi\Yukti\data\sample_documents\BID00002_udyam_certificate.pdf"),
    ("BID00003", r"C:\Users\shivi\Yukti\data\sample_documents\BID00003_gst_certificate.pdf"),
]

for bidder_id, path in samples:
    print(f"\n=== {bidder_id} ===")
    text = extract_text_from_pdf(path)
    fields = extract_certificate_fields(text)
    print("Extracted:", fields)
    result = verify_certificate_against_records(bidder_id, fields)
    print("Verification:", result)