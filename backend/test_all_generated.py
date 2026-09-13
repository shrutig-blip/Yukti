import os
from pdf_extractor import extract_text_from_pdf, extract_certificate_fields
from data_loader import verify_certificate_against_records

folder = r"C:\Users\shivi\Yukti\data\sample_documents\generated"
for fname in sorted(os.listdir(folder)):
    if not fname.endswith(".pdf"):
        continue
    path = os.path.join(folder, fname)
    bidder_id = fname.split("_")[0] if fname.startswith("BID") else None

    print(f"\n=== {fname} ===")
    text = extract_text_from_pdf(path)
    fields = extract_certificate_fields(text)
    print("Extracted:", fields)

    if bidder_id:
        result = verify_certificate_against_records(bidder_id, fields)
        print("Verification:", result)