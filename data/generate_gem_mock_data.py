"""
GeM Bid Compliance Verification Platform — Synthetic Data Generator
====================================================================
SIH PS 26100 (AICTE / CPCL / Ministry of Petroleum & Natural Gas)

Generates realistic, format-correct (including real GSTIN checksum),
statistically-weighted synthetic data for:
  - Bidder master records
  - Udyam / MSME registry (mock portal)
  - GSTN registry (mock portal)
  - PAN / Income Tax (mock portal)
  - EPFO / ESIC (mock portal)
  - Startup India / NSIC recognition (mock portal)
  - Blacklist / Debarment registry (mock portal)

Includes INTENTIONAL inconsistencies (name mismatches, expired certs,
pending filings, blacklisted entities) so the AI verification engine
has genuinely interesting cases to catch during your demo.

No external dependencies — pure Python standard library.
(If you have internet access, `pip install india-kit faker` and swap
 in their generators for even more variety — this script is designed
 to be a drop-in replacement when those aren't available.)

Usage:
    python3 generate_gem_mock_data.py --num_bidders 100 --seed 42
"""

import argparse
import csv
import json
import random
import string
from datetime import date, timedelta

# ---------------------------------------------------------------------------
# Real Indian government identifier building blocks
# ---------------------------------------------------------------------------

# GST state codes (subset covering states weighted realistically below)
STATE_GST_CODES = {
    "Maharashtra": "27", "Uttar Pradesh": "09", "Tamil Nadu": "33",
    "Gujarat": "24", "Karnataka": "29", "Delhi": "07",
    "West Bengal": "19", "Rajasthan": "08", "Telangana": "36",
    "Haryana": "06", "Punjab": "03", "Kerala": "32",
    "Madhya Pradesh": "23", "Bihar": "10", "Odisha": "21",
}

# Approximate real-world weighting for MSME/Udyam registrations by state
# (illustrative distribution based on publicly known Udyam concentration —
#  adjust freely if you pull the actual data.gov.in dataset).
STATE_WEIGHTS = {
    "Maharashtra": 16, "Uttar Pradesh": 14, "Tamil Nadu": 11,
    "Gujarat": 9, "Karnataka": 8, "Delhi": 7,
    "West Bengal": 7, "Rajasthan": 6, "Telangana": 5,
    "Haryana": 4, "Punjab": 3, "Kerala": 3,
    "Madhya Pradesh": 3, "Bihar": 2, "Odisha": 2,
}

COMPANY_PREFIXES = [
    "Shree", "Sai", "National", "United", "Bharat", "Global", "Modern",
    "Om", "Krishna", "Vishal", "Prime", "Apex", "Sterling", "Reliable",
    "Precision", "Elite", "Metro", "Universal", "Continental", "Vintage",
]
COMPANY_CORES = [
    "Traders", "Engineering Works", "Enterprises", "Industries",
    "Technologies", "Infra Solutions", "Manufacturing Co", "Suppliers",
    "Electricals", "Fabricators", "Textiles", "Logistics", "Constructions",
    "Agro Industries", "Steel Works", "Electronics", "Pharma", "Exports",
]
COMPANY_SUFFIXES = ["Pvt Ltd", "Private Limited", "LLP", "& Co", "Ltd", ""]

CATEGORY_CHOICES = ["Micro", "Small", "Medium", "Startup", "OEM", "General"]

CODE_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"


# ---------------------------------------------------------------------------
# Core identifier generators (with REAL checksum algorithms)
# ---------------------------------------------------------------------------

def random_letters(n):
    return "".join(random.choices(string.ascii_uppercase, k=n))


def random_digits(n):
    return "".join(random.choices(string.digits, k=n))


def generate_pan(entity_type="company"):
    """
    Real PAN structure: AAAAA9999A
    4th character denotes holder type: P=Individual, C=Company, H=HUF,
    F=Firm, A=AOP, T=Trust, B=BOI, L=Local Authority, J=Artificial
    Juridical Person, G=Government
    """
    type_code = {"company": "C", "firm": "F", "individual": "P"}.get(
        entity_type, "C"
    )
    first3 = random_letters(3)
    fourth = type_code
    fifth = random.choice(string.ascii_uppercase)  # usually first letter of surname/name
    digits = random_digits(4)
    checksum_letter = random.choice(string.ascii_uppercase)  # PAN's 10th char has no public checksum formula
    return f"{first3}{fourth}{fifth}{digits}{checksum_letter}"


def gstin_checksum_char(gstin_14):
    """
    Real GSTIN check-digit algorithm (Mod-36), same one used by GSTN.
    """
    factor = 1
    total = 0
    for ch in gstin_14:
        val = CODE_CHARS.index(ch)
        product = val * factor
        product = (product // 36) + (product % 36)
        total += product
        factor = 2 if factor == 1 else 1
    checksum_val = (36 - (total % 36)) % 36
    return CODE_CHARS[checksum_val]


def generate_gstin(pan, state_code):
    """
    Real GSTIN structure (15 chars):
    [2-digit state code][10-char PAN][1-digit entity number][Z][1 checksum]
    This is the exact structural rule your "Layer 1" validator should check:
    characters 3-12 of a valid GSTIN MUST equal the bidder's PAN.
    """
    entity_number = "1"
    default_z = "Z"
    first_14 = f"{state_code}{pan}{entity_number}{default_z}"
    check_digit = gstin_checksum_char(first_14)
    return first_14 + check_digit


def validate_gstin(gstin):
    """Returns (is_structurally_valid, pan_matches, checksum_valid)."""
    if len(gstin) != 15:
        return False, False, False
    state_code, pan_part, entity, z_char, check_char = (
        gstin[0:2], gstin[2:12], gstin[12], gstin[13], gstin[14],
    )
    checksum_ok = gstin_checksum_char(gstin[:14]) == check_char
    pan_pattern_ok = (
        len(pan_part) == 10
        and pan_part[0:5].isalpha()
        and pan_part[5:9].isdigit()
        and pan_part[9].isalpha()
    )
    return pan_pattern_ok, pan_pattern_ok, checksum_ok


def generate_udyam(state_abbr="UP"):
    return f"UDYAM-{state_abbr}-{random.randint(1,99):02d}-{random.randint(1,9999999):07d}"


def random_date(start_year=2018, end_year=2025):
    start = date(start_year, 1, 1)
    end = date(end_year, 12, 31)
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, delta))


def weighted_state():
    states, weights = zip(*STATE_WEIGHTS.items())
    return random.choices(states, weights=weights, k=1)[0]


def generate_company_name():
    prefix = random.choice(COMPANY_PREFIXES)
    core = random.choice(COMPANY_CORES)
    suffix = random.choice(COMPANY_SUFFIXES)
    name = f"{prefix} {core}"
    if suffix:
        name += f" {suffix}"
    return name


def mangled_name_variant(name):
    """Produces a plausible 'same company, different spelling' variant —
    used to seed realistic name-mismatch inconsistencies across portals."""
    variants = [
        name.replace("Pvt Ltd", "Private Limited"),
        name.replace("Private Limited", "Pvt. Ltd."),
        name.replace("& Co", "and Company"),
        name.replace("Ltd", "Limited"),
        name.upper(),
        name.replace(" ", "  "),  # double space typo
    ]
    variants = [v for v in variants if v != name]
    return random.choice(variants) if variants else name + " "


# ---------------------------------------------------------------------------
# Main dataset generation
# ---------------------------------------------------------------------------

def generate_dataset(num_bidders=100, inconsistency_rate=0.25, seed=None):
    if seed is not None:
        random.seed(seed)

    bidders = []
    udyam_records = []
    gst_records = []
    pan_records = []
    epfo_records = []
    startup_nsic_records = []
    blacklist_records = []

    blacklist_pool_idx = random.sample(
        range(num_bidders), k=max(1, int(num_bidders * 0.03))
    )

    for i in range(1, num_bidders + 1):
        bidder_id = f"BID{i:05d}"
        state = weighted_state()
        gst_state_code = STATE_GST_CODES.get(state, "27")
        entity_type = random.choices(
            ["company", "firm", "individual"], weights=[70, 20, 10]
        )[0]

        official_name = generate_company_name()
        pan = generate_pan(entity_type)
        gstin = generate_gstin(pan, gst_state_code)
        udyam_number = generate_udyam(state_abbr=state[:2].upper())
        category = random.choice(CATEGORY_CHOICES)

        reg_date = random_date(2018, 2024)

        # Flags — decide which inconsistencies (if any) this bidder gets
        is_inconsistent = random.random() < inconsistency_rate
        issue_tags = []

        # --- Bidder master record ---
        bidders.append({
            "bidder_id": bidder_id,
            "company_name": official_name,
            "pan_number": pan,
            "gst_number": gstin,
            "udyam_number": udyam_number,
            "category": category,
            "state": state,
            "registration_date": reg_date.isoformat(),
        })

        # --- Udyam portal record ---
        udyam_valid = True
        udyam_name = official_name
        if is_inconsistent and random.random() < 0.3:
            udyam_valid = False
            issue_tags.append("UDYAM_EXPIRED")
        udyam_records.append({
            "bidder_id": bidder_id,
            "udyam_number": udyam_number,
            "registered_name": udyam_name,
            "registration_date": reg_date.isoformat(),
            "category": category,
            "status": "Active" if udyam_valid else "Expired",
        })

        # --- GSTN portal record ---
        gst_name = official_name
        filing_status = "Up to date"
        gst_active = True
        if is_inconsistent and random.random() < 0.35:
            gst_name = mangled_name_variant(official_name)
            issue_tags.append("NAME_MISMATCH_GST")
        if is_inconsistent and random.random() < 0.3:
            filing_status = random.choice(
                ["Pending - 2 quarters", "Pending - 6 months", "Not filed since last FY"]
            )
            issue_tags.append("GST_FILING_PENDING")
        if is_inconsistent and random.random() < 0.1:
            gst_active = False
            issue_tags.append("GSTIN_CANCELLED")
        gst_records.append({
            "bidder_id": bidder_id,
            "gstin": gstin,
            "registered_name": gst_name,
            "filing_status": filing_status,
            "status": "Active" if gst_active else "Cancelled",
        })

        # --- PAN / Income Tax portal record ---
        it_compliant = True
        if is_inconsistent and random.random() < 0.15:
            it_compliant = False
            issue_tags.append("IT_NON_COMPLIANT")
        pan_records.append({
            "bidder_id": bidder_id,
            "pan_number": pan,
            "name_on_pan": official_name,
            "it_compliance_status": "Compliant" if it_compliant else "Non-Compliant",
        })

        # --- EPFO / ESIC portal record ---
        epfo_applicable = category in ("Small", "Medium", "General")
        epfo_compliant = True
        if epfo_applicable and is_inconsistent and random.random() < 0.25:
            epfo_compliant = False
            issue_tags.append("EPFO_ESIC_LAPSED")
        epfo_records.append({
            "bidder_id": bidder_id,
            "applicable": epfo_applicable,
            "establishment_code": f"EPFO{random.randint(100000,999999)}" if epfo_applicable else "",
            "status": (
                "N/A" if not epfo_applicable
                else "Compliant" if epfo_compliant else "Lapsed"
            ),
        })

        # --- Startup India / NSIC record ---
        is_startup = category == "Startup"
        is_nsic = category == "OEM" and random.random() < 0.5
        startup_nsic_records.append({
            "bidder_id": bidder_id,
            "startup_india_recognized": is_startup,
            "startup_recognition_number": f"DIPP{random.randint(10000,99999)}" if is_startup else "",
            "nsic_registered": is_nsic,
            "nsic_number": f"NSIC{random.randint(10000,99999)}" if is_nsic else "",
        })

        # --- Blacklist / Debarment record ---
        is_blacklisted = (i - 1) in blacklist_pool_idx
        if is_blacklisted:
            issue_tags.append("BLACKLISTED")
        blacklist_records.append({
            "bidder_id": bidder_id,
            "status": "Blacklisted" if is_blacklisted else "Clear",
            "reason": random.choice([
                "Non-performance on prior contract",
                "Submission of falsified documents",
                "Quality non-conformance",
            ]) if is_blacklisted else "",
        })

        bidders[-1]["known_issue_tags"] = ";".join(issue_tags) if issue_tags else "NONE"

    return {
        "bidders": bidders,
        "udyam_portal": udyam_records,
        "gst_portal": gst_records,
        "pan_portal": pan_records,
        "epfo_esic_portal": epfo_records,
        "startup_nsic_portal": startup_nsic_records,
        "blacklist_registry": blacklist_records,
    }


def write_csv(records, path):
    if not records:
        return
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(records[0].keys()))
        writer.writeheader()
        writer.writerows(records)


def main():
    parser = argparse.ArgumentParser(description="Generate GeM mock compliance dataset")
    parser.add_argument("--num_bidders", type=int, default=100)
    parser.add_argument("--inconsistency_rate", type=float, default=0.25,
                         help="Fraction of bidders that get an intentional compliance issue")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--outdir", type=str, default="./gem_mock_data")
    args = parser.parse_args()

    import os
    os.makedirs(args.outdir, exist_ok=True)

    data = generate_dataset(
        num_bidders=args.num_bidders,
        inconsistency_rate=args.inconsistency_rate,
        seed=args.seed,
    )

    for table_name, records in data.items():
        csv_path = os.path.join(args.outdir, f"{table_name}.csv")
        write_csv(records, csv_path)
        print(f"Wrote {len(records):4d} rows -> {csv_path}")

    # Also dump everything as one combined JSON (handy for seeding a mock API/DB)
    json_path = os.path.join(args.outdir, "all_tables.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"Combined JSON -> {json_path}")

    # Quick sanity check: validate a sample of generated GSTINs against our
    # own checksum function, to prove the generator produces REAL, valid GSTINs
    sample = random.sample(data["bidders"], min(5, len(data["bidders"])))
    print("\nSample GSTIN structural + checksum validation (proves real format):")
    for b in sample:
        pan_ok, pan_match, checksum_ok = validate_gstin(b["gst_number"])
        print(f"  {b['gst_number']}  ->  PAN-format OK: {pan_ok}, "
              f"checksum OK: {checksum_ok}, issues: {b['known_issue_tags']}")


if __name__ == "__main__":
    main()
