"""
Generates 3 fake 'certificate' PDFs to demo the AI document-extraction flow:
  1. BID00001 - clean GST certificate, everything matches portal data
  2. BID00003 (name-mismatch case) - certificate name deliberately spelled
     differently from what's on the GST portal -> AI should flag mismatch
  3. BID00002 - Udyam certificate showing an expiry date in the past

These are NOT meant to be realistic government templates (avoid impersonating
an official document) - simple, clearly-labelled 'SAMPLE / DEMO DOCUMENT'
certificates with the key fields our AI extraction step needs to pull out.
"""
import csv
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

OUT_DIR = "sample_documents"
import os
os.makedirs(OUT_DIR, exist_ok=True)

def make_certificate(filename, title, fields, note=None):
    path = f"{OUT_DIR}/{filename}"
    c = canvas.Canvas(path, pagesize=A4)
    width, height = A4

    c.setFillColorRGB(0.85, 0.1, 0.1)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(width / 2, height - 1.5 * cm, "SAMPLE / DEMO DOCUMENT - NOT A REAL GOVERNMENT CERTIFICATE")

    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width / 2, height - 3 * cm, title)

    c.setFont("Helvetica", 12)
    y = height - 5 * cm
    for label, value in fields.items():
        c.drawString(3 * cm, y, f"{label}:")
        c.drawString(9 * cm, y, str(value))
        y -= 1 * cm

    if note:
        c.setFont("Helvetica-Oblique", 9)
        c.setFillColorRGB(0.4, 0.4, 0.4)
        c.drawString(3 * cm, 3 * cm, note)

    c.save()
    print(f"Created {path}")


# Load actual dataset values so the docs line up with (or intentionally
# diverge from) bidders.csv / gst_portal.csv / udyam_portal.csv
bidders = {r["bidder_id"]: r for r in csv.DictReader(open("data/bidders.csv"))}

# 1. CLEAN CASE - BID00001, everything matches
b = bidders["BID00001"]
make_certificate(
    "BID00001_gst_certificate.pdf",
    "GST Registration Certificate",
    {
        "Legal Name": b["company_name"],
        "GSTIN": b["gst_number"],
        "PAN": b["pan_number"],
        "Date of Registration": b["registration_date"],
        "Status": "Active",
    },
    note="Case: Clean match - name/GSTIN/PAN should match portal records exactly.",
)

# 2. NAME MISMATCH CASE - BID00003, spelled differently on the certificate
b = bidders["BID00003"]
mismatched_name = b["company_name"].replace("LLP", "Ltd.").replace("Suppliers", "Supplier's")
make_certificate(
    "BID00003_gst_certificate.pdf",
    "GST Registration Certificate",
    {
        "Legal Name": mismatched_name,   # deliberately different from portal
        "GSTIN": b["gst_number"],
        "PAN": b["pan_number"],
        "Date of Registration": b["registration_date"],
        "Status": "Active",
    },
    note=f"Case: Name mismatch - portal has '{b['company_name']}', certificate says '{mismatched_name}'.",
)

# 3. EXPIRED UDYAM CASE - BID00002
b = bidders["BID00002"]
make_certificate(
    "BID00002_udyam_certificate.pdf",
    "Udyam Registration Certificate",
    {
        "Name of Enterprise": b["company_name"],
        "Udyam Registration Number": b["udyam_number"],
        "Category": b["category"],
        "Date of Registration": b["registration_date"],
        "Valid Upto": "2023-12-31",   # in the past -> expired
    },
    note="Case: Expired registration - 'Valid Upto' date has already passed.",
)

print("\nAll 3 sample documents generated in sample_documents/")
