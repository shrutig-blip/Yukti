"""
Generates PAN and EPFO test certificate PDFs for OCR pipeline testing.
Reads real values from pan_portal.csv and epfo_esic_portal.csv so the
generated certificates are guaranteed to match (or intentionally mismatch,
if you flip a flag) against the mock portal records.

Run this from the `backend` folder:
    python generate_test_certificates.py

Requires: pip install reportlab --break-system-packages   (or without the flag on Windows)
"""

import os
import pandas as pd
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

# ---- paths (matches your data_loader.py layout) ----
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "data", "data")
OUT_DIR = os.path.join(BASE_DIR, "..", "data", "sample_documents")

bidders_df = pd.read_csv(os.path.join(DATA_DIR, "bidders.csv"))
pan_df = pd.read_csv(os.path.join(DATA_DIR, "pan_portal.csv"))
epfo_df = pd.read_csv(os.path.join(DATA_DIR, "epfo_esic_portal.csv"))


def make_pdf(filename: str, lines: list[str]):
    """Writes a simple certificate-style PDF: one field per line."""
    path = os.path.join(OUT_DIR, filename)
    c = canvas.Canvas(path, pagesize=A4)
    width, height = A4
    y = height - 80
    c.setFont("Helvetica", 12)
    for line in lines:
        c.drawString(60, y, line)
        y -= 24
    c.save()
    print(f"Created: {path}")


def get_bidder_name(bidder_id: str) -> str:
    row = bidders_df[bidders_df["bidder_id"] == bidder_id]
    return row.iloc[0]["company_name"] if not row.empty else "Unknown Bidder"


def generate_pan_certificate(bidder_id: str, force_name_mismatch: bool = False):
    row = pan_df[pan_df["bidder_id"] == bidder_id]
    if row.empty:
        print(f"No PAN portal record for {bidder_id}, skipping.")
        return
    p = row.iloc[0]
    name_on_pan = p["name_on_pan"]
    display_name = name_on_pan + " Pvt" if force_name_mismatch else name_on_pan
    case_note = "Name mismatch test case." if force_name_mismatch else "Clean match - name/PAN should match portal records exactly."

    lines = [
        "SAMPLE / DEMO DOCUMENT - NOT A REAL GOVERNMENT DOCUMENT",
        "",
        "Income Tax Department",
        "Permanent Account Number Card",
        "",
        f"Name: {display_name}",
        f"PAN Number: {p['pan_number']}",
        "Date of Birth: 1990-01-01",
        "Father's Name: Not Applicable (Company)",
        "",
        f"Case: {case_note}",
    ]
    suffix = "_mismatch" if force_name_mismatch else ""
    make_pdf(f"{bidder_id}_pan_certificate{suffix}.pdf", lines)


def generate_epfo_certificate(bidder_id: str, force_code_mismatch: bool = False):
    row = epfo_df[epfo_df["bidder_id"] == bidder_id]
    if row.empty:
        print(f"No EPFO portal record for {bidder_id}, skipping.")
        return
    e = row.iloc[0]
    if not bool(e["applicable"]):
        print(f"EPFO not applicable for {bidder_id} per portal record, skipping (this itself is a valid test case for the 'not applicable' path).")
        return

    est_code = e["establishment_code"]
    display_code = est_code[:-2] + "XX" if force_code_mismatch else est_code
    case_note = "Establishment code mismatch test case." if force_code_mismatch else "Clean match - establishment code should match portal records exactly."
    company_name = get_bidder_name(bidder_id)

    lines = [
        "SAMPLE / DEMO DOCUMENT - NOT A REAL GOVERNMENT DOCUMENT",
        "",
        "Employees' Provident Fund Organisation (EPFO)",
        "Establishment Registration Certificate",
        "",
        f"Name of Establishment: {company_name}",
        f"Establishment Code Number: {display_code}",
        "Date of Registration: 2019-06-15",
        "",
        f"Case: {case_note}",
    ]
    suffix = "_mismatch" if force_code_mismatch else ""
    make_pdf(f"{bidder_id}_epfo_certificate{suffix}.pdf", lines)


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)

    # Clean-match cases
    generate_pan_certificate("BID00001")
    generate_epfo_certificate("BID00002")

    # Intentional-mismatch cases (to prove verify_certificate_against_records
    # actually catches fraud/errors, not just clean matches)
    generate_pan_certificate("BID00002", force_name_mismatch=True)
    generate_epfo_certificate("BID00003", force_code_mismatch=True)

    print("\nDone. Run your extraction+verification test script against these files.")