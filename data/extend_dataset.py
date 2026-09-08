"""
Extends the original gem_dataset_package with the pieces the base dataset
was missing (see chat discussion):
  1. local_content_percent + annual_turnover_cr columns on bidders.csv
  2. tender_criteria.csv - 4 sample tenders with eligibility rules
  3. tender_bids.csv - which bidder applied to which tender (many-to-many)
Reproducible: same seed = same output.
"""
import csv
import random

random.seed(42)

DATA_DIR = "data"

# ---------- 1. Add local_content_percent + turnover to bidders.csv ----------
with open(f"{DATA_DIR}/bidders.csv", newline="") as f:
    reader = csv.DictReader(f)
    bidders = list(reader)
    fieldnames = reader.fieldnames

for b in bidders:
    # Make in India / local content - most bidders decent, some below the
    # usual 50% threshold used in GeM Make in India orders, so demo has
    # something to flag.
    if random.random() < 0.15:
        b["local_content_percent"] = random.randint(10, 45)
    else:
        b["local_content_percent"] = random.randint(50, 100)

    # Annual turnover in INR crore - used for tender minimum-turnover checks
    category = b.get("category", "General")
    if category == "OEM":
        b["annual_turnover_cr"] = round(random.uniform(20, 200), 2)
    elif category == "Medium":
        b["annual_turnover_cr"] = round(random.uniform(5, 50), 2)
    else:
        b["annual_turnover_cr"] = round(random.uniform(0.5, 15), 2)

new_fieldnames = fieldnames + ["local_content_percent", "annual_turnover_cr"]
with open(f"{DATA_DIR}/bidders.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=new_fieldnames)
    writer.writeheader()
    writer.writerows(bidders)

print(f"Updated bidders.csv with local_content_percent + annual_turnover_cr for {len(bidders)} rows")

# ---------- 2. tender_criteria.csv ----------
tenders = [
    {
        "tender_id": "TND001",
        "tender_title": "Supply of Industrial Safety Equipment",
        "category_allowed": "General;Medium;OEM",
        "min_turnover_cr": 2,
        "min_local_content_percent": 50,
        "msme_only": "False",
        "startup_relaxation": "False",
    },
    {
        "tender_id": "TND002",
        "tender_title": "MSME Reserved - Office Stationery Supply",
        "category_allowed": "General;Medium",
        "min_turnover_cr": 0,
        "min_local_content_percent": 50,
        "msme_only": "True",
        "startup_relaxation": "True",
    },
    {
        "tender_id": "TND003",
        "tender_title": "Refinery Spare Parts - OEM Only",
        "category_allowed": "OEM",
        "min_turnover_cr": 10,
        "min_local_content_percent": 60,
        "msme_only": "False",
        "startup_relaxation": "False",
    },
    {
        "tender_id": "TND004",
        "tender_title": "IT Hardware Procurement",
        "category_allowed": "General;Medium;OEM",
        "min_turnover_cr": 5,
        "min_local_content_percent": 40,
        "msme_only": "False",
        "startup_relaxation": "True",
    },
]

with open(f"{DATA_DIR}/tender_criteria.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=list(tenders[0].keys()))
    writer.writeheader()
    writer.writerows(tenders)

print(f"Created tender_criteria.csv with {len(tenders)} sample tenders")

# ---------- 3. tender_bids.csv (who applied where) ----------
tender_bids = []
for b in bidders:
    # each bidder applies to 1-2 random tenders
    applied = random.sample(tenders, k=random.choice([1, 1, 2]))
    for t in applied:
        tender_bids.append({
            "tender_id": t["tender_id"],
            "bidder_id": b["bidder_id"],
            "bid_submitted_date": b["registration_date"],
        })

with open(f"{DATA_DIR}/tender_bids.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["tender_id", "bidder_id", "bid_submitted_date"])
    writer.writeheader()
    writer.writerows(tender_bids)

print(f"Created tender_bids.csv with {len(tender_bids)} bid records")
