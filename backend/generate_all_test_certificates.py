"""
Comprehensive test certificate generator for Yukti's OCR + verification pipeline.

Generates GST, Udyam, PAN, and EPFO certificates for multiple bidders, covering
BOTH clean-match cases (should pass) and intentional-mismatch/fraud cases
(should be caught and flagged). Reads real values from your portal CSVs so
clean-match certificates are guaranteed to verify correctly, and generates
mathematically VALID GSTIN checksums (not random placeholders) so
gstin_checksum_valid isn't a false negative.

Run from the `backend` folder:
    python generate_all_test_certificates.py

Requires: pip install reportlab
"""

import os
import random
import pandas as pd
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "data", "data")
OUT_DIR = os.path.join(BASE_DIR, "..", "data", "sample_documents", "generated")

bidders_df = pd.read_csv(os.path.join(DATA_DIR, "bidders.csv"))
gst_df = pd.read_csv(os.path.join(DATA_DIR, "gst_portal.csv"))
pan_df = pd.read_csv(os.path.join(DATA_DIR, "pan_portal.csv"))
udyam_df = pd.read_csv(os.path.join(DATA_DIR, "udyam_portal.csv"))
epfo_df = pd.read_csv(os.path.join(DATA_DIR, "epfo_esic_portal.csv"))

_GSTIN_CODE_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def compute_gstin_checksum_char(gstin_14: str) -> str:
    """Given the first 14 characters of a GSTIN, computes the correct
    15th (checksum) character using the same Luhn mod-36 algorithm the
    verifier uses — so generated 'clean' GSTINs actually pass validation."""
    factor = 1
    total = 0
    mod = 36
    for char in gstin_14:
        code_point = _GSTIN_CODE_CHARS.index(char)
        digit = factor * code_point
        digit = (digit // mod) + (digit % mod)
        total += digit
        factor = 2 if factor == 1 else 1
    checksum = (mod - (total % mod)) % mod
    return _GSTIN_CODE_CHARS[checksum]


def make_valid_gstin(state_code: str, pan: str, entity_code: str = "1") -> str:
    """Builds a checksum-valid 15-char GSTIN from a state code (2 digits),
    a 10-char PAN, and an entity code (1 char, usually '1')."""
    body = f"{state_code}{pan}{entity_code}Z"  # positions 0-13 (14 chars)
    checksum = compute_gstin_checksum_char(body)
    return body + checksum


def make_pdf(filename: str, lines: list[str]):
    path = os.path.join(OUT_DIR, filename)
    c = canvas.Canvas(path, pagesize=A4)
    width, height = A4
    y = height - 80
    c.setFont("Helvetica", 12)
    for line in lines:
        c.drawString(60, y, line)
        y -= 24
    c.save()
    print(f"Created: {filename}")


def get_bidder_name(bidder_id: str) -> str:
    row = bidders_df[bidders_df["bidder_id"] == bidder_id]
    return row.iloc[0]["company_name"] if not row.empty else "Unknown Bidder"


# ---------------------------------------------------------------------------
# GST
# ---------------------------------------------------------------------------
def generate_gst_certificate(bidder_id: str, scenario: str = "clean"):
    """scenario: 'clean' | 'name_mismatch' | 'gstin_mismatch' | 'bad_checksum'"""
    row = gst_df[gst_df["bidder_id"] == bidder_id]
    if row.empty:
        print(f"[skip] No GST portal record for {bidder_id}")
        return
    g = row.iloc[0]
    name = g["registered_name"]
    gstin = g["gstin"]

    case_note = "Clean match - should pass all checks."
    if scenario == "name_mismatch":
        name = name + " (Unit-2)"
        case_note = "Name mismatch test - legal name differs from portal record."
    elif scenario == "gstin_mismatch":
        gstin = gstin[:-1] + ("0" if gstin[-1] != "0" else "1")
        case_note = "GSTIN mismatch test - last char altered, should fail portal match but pass its own checksum only if regenerated; here it's a controlled corruption."
    elif scenario == "bad_checksum":
        # Deliberately invalid checksum char, to test that
        # gstin_checksum_valid correctly comes back False.
        gstin = gstin[:-1] + ("X" if gstin[-1] != "X" else "Y")
        case_note = "Invalid checksum test - GSTIN checksum should fail validation."

    lines = [
        "SAMPLE / DEMO DOCUMENT - NOT A REAL GOVERNMENT CERTIFICATE",
        "",
        "GST Registration Certificate",
        "",
        f"Legal Name: {name}",
        f"GSTIN: {gstin}",
        f"PAN: {gstin[2:12]}",
        "Date of Registration: 2021-02-13",
        "Status: Active",
        "",
        f"Case: {case_note}",
    ]
    make_pdf(f"{bidder_id}_gst_{scenario}.pdf", lines)


# ---------------------------------------------------------------------------
# UDYAM
# ---------------------------------------------------------------------------
def generate_udyam_certificate(bidder_id: str, scenario: str = "clean"):
    """scenario: 'clean' | 'name_mismatch' | 'number_mismatch' | 'expired'"""
    row = udyam_df[udyam_df["bidder_id"] == bidder_id]
    if row.empty:
        print(f"[skip] No Udyam portal record for {bidder_id}")
        return
    u = row.iloc[0]
    name = u["registered_name"]
    number = u["udyam_number"]
    valid_upto = "2028-12-31"

    case_note = "Clean match - should pass all checks."
    if scenario == "name_mismatch":
        name = name + " LLP"
        case_note = "Name mismatch test."
    elif scenario == "number_mismatch":
        number = number[:-2] + "XX"
        case_note = "Udyam number mismatch test."
    elif scenario == "expired":
        valid_upto = "2022-01-01"
        case_note = "Expired registration test - valid_upto is in the past."

    lines = [
        "SAMPLE / DEMO DOCUMENT - NOT A REAL GOVERNMENT CERTIFICATE",
        "",
        "Udyam Registration Certificate",
        "",
        f"Name of Enterprise: {name}",
        f"Udyam Registration Number: {number}",
        "Category: Medium",
        "Date of Registration: 2021-06-01",
        f"Valid Upto: {valid_upto}",
        "",
        f"Case: {case_note}",
    ]
    make_pdf(f"{bidder_id}_udyam_{scenario}.pdf", lines)


# ---------------------------------------------------------------------------
# PAN
# ---------------------------------------------------------------------------
def generate_pan_certificate(bidder_id: str, scenario: str = "clean"):
    """scenario: 'clean' | 'name_mismatch' | 'pan_mismatch'"""
    row = pan_df[pan_df["bidder_id"] == bidder_id]
    if row.empty:
        print(f"[skip] No PAN portal record for {bidder_id}")
        return
    p = row.iloc[0]
    name = p["name_on_pan"]
    pan_number = p["pan_number"]

    case_note = "Clean match - should pass all checks."
    if scenario == "name_mismatch":
        name = name + " Pvt"
        case_note = "Name mismatch test."
    elif scenario == "pan_mismatch":
        pan_number = pan_number[:-1] + ("X" if pan_number[-1] != "X" else "Y")
        case_note = "PAN number mismatch test."

    lines = [
        "SAMPLE / DEMO DOCUMENT - NOT A REAL GOVERNMENT DOCUMENT",
        "",
        "Income Tax Department",
        "Permanent Account Number Card",
        "",
        f"Name: {name}",
        f"PAN Number: {pan_number}",
        "Date of Birth: 1990-01-01",
        "Father's Name: Not Applicable (Company)",
        "",
        f"Case: {case_note}",
    ]
    make_pdf(f"{bidder_id}_pan_{scenario}.pdf", lines)


# ---------------------------------------------------------------------------
# EPFO
# ---------------------------------------------------------------------------
def generate_epfo_certificate(bidder_id: str, scenario: str = "clean"):
    """scenario: 'clean' | 'code_mismatch'"""
    row = epfo_df[epfo_df["bidder_id"] == bidder_id]
    if row.empty:
        print(f"[skip] No EPFO portal record for {bidder_id}")
        return
    e = row.iloc[0]
    if not bool(e["applicable"]):
        print(f"[skip] EPFO not applicable for {bidder_id} (this is itself a valid test case)")
        return

    code = e["establishment_code"]
    case_note = "Clean match - should pass all checks."
    if scenario == "code_mismatch":
        code = code[:-2] + "XX"
        case_note = "Establishment code mismatch test."

    company_name = get_bidder_name(bidder_id)
    lines = [
        "SAMPLE / DEMO DOCUMENT - NOT A REAL GOVERNMENT DOCUMENT",
        "",
        "Employees' Provident Fund Organisation (EPFO)",
        "Establishment Registration Certificate",
        "",
        f"Name of Establishment: {company_name}",
        f"Establishment Code Number: {code}",
        "Date of Registration: 2019-06-15",
        "",
        f"Case: {case_note}",
    ]
    make_pdf(f"{bidder_id}_epfo_{scenario}.pdf", lines)


# ---------------------------------------------------------------------------
# Standalone GSTIN-checksum demo (not tied to any bidder — useful to prove
# the checksum math itself works before testing full documents)
# ---------------------------------------------------------------------------
def generate_standalone_gst_examples():
    valid_gstin = make_valid_gstin("07", "AAAAA1234A", "1")
    invalid_gstin = valid_gstin[:-1] + ("0" if valid_gstin[-1] != "0" else "1")

    make_pdf("STANDALONE_gst_valid_checksum.pdf", [
        "SAMPLE / DEMO DOCUMENT - NOT A REAL GOVERNMENT CERTIFICATE",
        "", "GST Registration Certificate", "",
        "Legal Name: Standalone Test Traders",
        f"GSTIN: {valid_gstin}",
        f"PAN: {valid_gstin[2:12]}",
        "Date of Registration: 2020-01-01",
        "Status: Active",
        "", "Case: Mathematically valid GSTIN checksum, no portal record exists for this bidder (expect 'No GST portal record' on verify).",
    ])
    make_pdf("STANDALONE_gst_invalid_checksum.pdf", [
        "SAMPLE / DEMO DOCUMENT - NOT A REAL GOVERNMENT CERTIFICATE",
        "", "GST Registration Certificate", "",
        "Legal Name: Standalone Test Traders",
        f"GSTIN: {invalid_gstin}",
        f"PAN: {invalid_gstin[2:12]}",
        "Date of Registration: 2020-01-01",
        "Status: Active",
        "", "Case: Deliberately invalid GSTIN checksum - gstin_checksum_valid should be False.",
    ])


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)

    all_bidder_ids = bidders_df["bidder_id"].tolist()
    # Use up to the first 5 bidders that actually have records, for variety
    sample_ids = all_bidder_ids[:5] if len(all_bidder_ids) >= 5 else all_bidder_ids

    print(f"Generating certificates for bidders: {sample_ids}\n")

    for bidder_id in sample_ids:
        generate_gst_certificate(bidder_id, "clean")
        generate_udyam_certificate(bidder_id, "clean")
        generate_pan_certificate(bidder_id, "clean")
        generate_epfo_certificate(bidder_id, "clean")

    # Mismatch/fraud scenarios — spread across a couple of bidders
    if len(sample_ids) >= 1:
        generate_gst_certificate(sample_ids[0], "name_mismatch")
        generate_gst_certificate(sample_ids[0], "bad_checksum")
        generate_pan_certificate(sample_ids[0], "name_mismatch")
    if len(sample_ids) >= 2:
        generate_gst_certificate(sample_ids[1], "gstin_mismatch")
        generate_udyam_certificate(sample_ids[1], "expired")
        generate_epfo_certificate(sample_ids[1], "code_mismatch")
    if len(sample_ids) >= 3:
        generate_udyam_certificate(sample_ids[2], "name_mismatch")
        generate_pan_certificate(sample_ids[2], "pan_mismatch")
    if len(sample_ids) >= 4:
        generate_udyam_certificate(sample_ids[3], "number_mismatch")

    generate_standalone_gst_examples()

    print(f"\nDone. Files written to: {OUT_DIR}")
    print("Run your extraction+verification test script against these files.")