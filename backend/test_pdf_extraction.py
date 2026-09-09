from pdf_extractor import extract_text_from_pdf, extract_certificate_fields

text = extract_text_from_pdf("test_data/BID00003_gst_certificate.pdf")
print("---RAW TEXT---")
print(text)
print("---EXTRACTED FIELDS---")
print(extract_certificate_fields(text))