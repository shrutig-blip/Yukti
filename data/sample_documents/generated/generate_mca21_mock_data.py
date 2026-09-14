"""
Generates data/data/mca21_portal.csv — a mock Ministry of Corporate Affairs
(MCA21) company-master-data portal record for every existing bidder in
bidders.csv, in the same spirit as gst_portal.csv / pan_portal.csv.

WHY A SEPARATE SCRIPT instead of touching generate_gem_mock_data.py:
generate_gem_mock_data.py's `generate_dataset()` is a from-scratch generator
seeded once and already baked into the committed CSVs (150 rows, extended
beyond its own default num_bidders=100 by data/extend_dataset.py). Re-running
it would regenerate ALL tables from a fresh random stream and silently
desync bidder_id <-> company_name <-> pan/gst pairings that other code and
tests already depend on. Instead, this script is READ-ONLY against the
existing bidders.csv (the source of truth for company_name/state/category/
registration_date) and only WRITES the new mca21_portal.csv table — no
existing file is modified.

CIN (Corporate Identification Number) format reproduced here is the real
MCA21 structure: L|U + 5-digit industry code + 2-letter state code +
4-digit incorporation year + 3-letter ownership-type code + 6-digit
registration number. Example: U29200MH2015PTC123456.

Determinism: seeded on each bidder_id (not a single global seed) so this
script can be re-run safely and always reproduces the exact same output —
no run-to-run drift, no need to commit a random seed file.
"""
import argparse
import csv
import hashlib
import os
import random
from datetime import date

import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
BIDDERS_PATH = os.path.join(DATA_DIR, "bidders.csv")
OUT_PATH = os.path.join(DATA_DIR, "mca21_portal.csv")

# Real MCA21 state codes (subset covering the states present in bidders.csv)
STATE_MCA_CODES = {
    "Uttar Pradesh": "UP", "West Bengal": "WB", "Karnataka": "KA",
    "Maharashtra": "MH", "Delhi": "DL", "Punjab": "PB", "Telangana": "TG",
    "Haryana": "HR", "Gujarat": "GJ", "Tamil Nadu": "TN", "Rajasthan": "RJ",
    "Kerala": "KL", "Madhya Pradesh": "MP", "Bihar": "BR", "Odisha": "OR",
    "Assam": "AS", "Chhattisgarh": "CG", "Jharkhand": "JH",
    "Andhra Pradesh": "AP", "Uttarakhand": "UK",
}

OWNERSHIP_CODES = ["PLC", "PTC"]  # Public / Private limited company
ROC_OFFICES = {
    "UP": "RoC Kanpur", "WB": "RoC Kolkata", "KA": "RoC Bangalore",
    "MH": "RoC Mumbai", "DL": "RoC Delhi", "PB": "RoC Chandigarh",
    "TG": "RoC Hyderabad", "HR": "RoC Chandigarh", "GJ": "RoC Ahmedabad",
    "TN": "RoC Chennai", "RJ": "RoC Jaipur", "KL": "RoC Ernakulam",
    "MP": "RoC Gwalior", "BR": "RoC Patna", "OR": "RoC Cuttack",
    "AS": "RoC Guwahati", "CG": "RoC Raipur", "JH": "RoC Ranchi",
    "AP": "RoC Andhra Pradesh", "UK": "RoC Dehradun",
}


def _rng_for(bidder_id: str) -> random.Random:
    """Per-bidder deterministic RNG, independent of iteration order."""
    seed = int(hashlib.sha256(bidder_id.encode()).hexdigest(), 16) % (2**32)
    return random.Random(seed)


def mangled_name_variant(name: str, rng: random.Random) -> str:
    """Same kind of light corruption used elsewhere in this dataset (e.g.
    GST name-mismatch records) to model a genuine MCA21-vs-bidder-record
    name discrepancy, not a synthetic error class of its own."""
    variants = [
        name.replace("Limited", "Ltd").replace("Private", "Pvt"),
        name.upper(),
        name + " (Formerly known name on record)",
        name.replace(" ", "  "),  # double space, a common OCR/entry artefact
    ]
    return rng.choice(variants)


def generate_cin(state_abbr: str, incorporation_year: int, rng: random.Random) -> str:
    industry_code = f"{rng.randint(10000, 99999)}"
    ownership = rng.choice(OWNERSHIP_CODES)
    reg_number = f"{rng.randint(1, 999999):06d}"
    prefix = "U" if ownership == "PTC" else "L"
    return f"{prefix}{industry_code}{state_abbr}{incorporation_year}{ownership}{reg_number}"


def generate_mca21_portal(bidders_df: pd.DataFrame) -> list[dict]:
    records = []
    for _, b in bidders_df.iterrows():
        bidder_id = b["bidder_id"]
        rng = _rng_for(bidder_id)

        state_abbr = STATE_MCA_CODES.get(b["state"], "DL")
        try:
            incorporation_year = int(str(b["registration_date"])[:4])
        except (ValueError, TypeError):
            incorporation_year = 2020

        cin = generate_cin(state_abbr, incorporation_year, rng)

        # ~12% inconsistency rate — same order of magnitude as the other
        # portal generators in this dataset (GST ~10-35% depending on issue
        # type, PAN ~15%), so MCA21 doesn't stand out as artificially clean
        # or artificially broken next to the tables it sits alongside.
        is_inconsistent = rng.random() < 0.12

        company_name_mca = b["company_name"]
        company_status = "Active"
        filing_status = "Up to date"
        director_kyc_status = "Compliant"

        if is_inconsistent:
            issue = rng.choice(["name_mismatch", "filing_overdue", "status_flag", "director_kyc"])
            if issue == "name_mismatch":
                company_name_mca = mangled_name_variant(b["company_name"], rng)
            elif issue == "filing_overdue":
                filing_status = rng.choice(["AOC-4 Overdue", "MGT-7 Overdue", "Overdue - 2 FYs"])
            elif issue == "status_flag":
                company_status = rng.choice(["Strike Off", "Under Liquidation", "Dormant"])
            elif issue == "director_kyc":
                director_kyc_status = "Non-Compliant (DIN under deactivation)"

        records.append({
            "bidder_id": bidder_id,
            "cin": cin,
            "company_name_mca": company_name_mca,
            "date_of_incorporation": b["registration_date"],
            "roc_office": ROC_OFFICES.get(state_abbr, "RoC Delhi"),
            "company_status": company_status,
            "filing_status": filing_status,
            "director_kyc_status": director_kyc_status,
        })
    return records


def write_csv(records: list[dict], path: str) -> None:
    if not records:
        return
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(records[0].keys()))
        writer.writeheader()
        writer.writerows(records)


def main():
    parser = argparse.ArgumentParser(description="Generate mca21_portal.csv from existing bidders.csv")
    parser.add_argument("--bidders", default=BIDDERS_PATH)
    parser.add_argument("--out", default=OUT_PATH)
    args = parser.parse_args()

    bidders_df = pd.read_csv(args.bidders)
    records = generate_mca21_portal(bidders_df)
    write_csv(records, args.out)
    print(f"Wrote {len(records)} rows -> {args.out}")


if __name__ == "__main__":
    main()
