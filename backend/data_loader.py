import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..","data", "data")

bidders_df = pd.read_csv(os.path.join(DATA_DIR, "bidders.csv"))
tender_criteria_df = pd.read_csv(os.path.join(DATA_DIR, "tender_criteria.csv"))
tender_bids_df = pd.read_csv(os.path.join(DATA_DIR, "tender_bids.csv"))
gst_df = pd.read_csv(os.path.join(DATA_DIR, "gst_portal.csv"))
pan_df = pd.read_csv(os.path.join(DATA_DIR, "pan_portal.csv"))
udyam_df = pd.read_csv(os.path.join(DATA_DIR, "udyam_portal.csv"))
blacklist_df = pd.read_csv(os.path.join(DATA_DIR, "blacklist_registry.csv"))

def get_bidder_by_id(bidder_id: str):
    row = bidders_df[bidders_df["bidder_id"] == bidder_id]
    if row.empty:
        return None
    return row.iloc[0].to_dict()

def get_criteria_by_tender(tender_id: str):
    rows = tender_criteria_df[tender_criteria_df["tender_id"] == tender_id]
    if rows.empty:
        return None
    return rows.iloc[0].to_dict()

def check_compliance(bidder_id: str, tender_id: str):
    bidder = get_bidder_by_id(bidder_id)
    tender = get_criteria_by_tender(tender_id)

    if bidder is None or tender is None:
        return None

    results = []

    # 1. Turnover check — startup exemption applies (GFR Rule 173 / DPIIT policy)
    is_exempt = tender["startup_relaxation"] and bidder.get("is_startup", False)

    if is_exempt:
        results.append({
            "criterion": "annual_turnover_cr",
            "required": tender["min_turnover_cr"],
            "bidder_value": bidder["annual_turnover_cr"],
            "passed": True,
            "note": "Exempted under DPIIT startup relaxation (GFR Rule 173)"
        })
    else:
        turnover_ok = bidder["annual_turnover_cr"] >= tender["min_turnover_cr"]
        results.append({
            "criterion": "annual_turnover_cr",
            "required": tender["min_turnover_cr"],
            "bidder_value": bidder["annual_turnover_cr"],
            "passed": turnover_ok
        })

    # 2. Local content % — no exemption for this
    local_ok = bidder["local_content_percent"] >= tender["min_local_content_percent"]
    results.append({
        "criterion": "local_content_percent",
        "required": tender["min_local_content_percent"],
        "bidder_value": bidder["local_content_percent"],
        "passed": local_ok
    })

    # 3. Category allowed
    allowed_categories = tender["category_allowed"].split(";")
    category_ok = bidder["category"] in allowed_categories
    results.append({
        "criterion": "category_allowed",
        "required": tender["category_allowed"],
        "bidder_value": bidder["category"],
        "passed": category_ok
    })

    # 4. MSME-only check
    if tender["msme_only"]:
        msme_ok = bidder["category"] != "OEM"
        results.append({
            "criterion": "msme_only",
            "required": True,
            "bidder_value": bidder["category"],
            "passed": msme_ok
        })

    overall_compliant = all(r["passed"] for r in results)

    return {
        "bidder_id": bidder_id,
        "tender_id": tender_id,
        "overall_compliant": overall_compliant,
        "details": results
    }
print(bidders_df[(bidders_df["is_startup"] == True) & (bidders_df["annual_turnover_cr"] < 5)][["bidder_id", "annual_turnover_cr", "is_startup"]].head())

def verify_bidder_credentials(bidder_id: str):
    bidder = get_bidder_by_id(bidder_id)
    if bidder is None:
        return None

    checks = []

    # --- GST check ---
    gst_row = gst_df[gst_df["bidder_id"] == bidder_id]
    if gst_row.empty:
        checks.append({"check": "gst", "passed": False, "detail": "No GST record found"})
    else:
        g = gst_row.iloc[0]
        name_match = g["registered_name"].strip().lower() == bidder["company_name"].strip().lower()
        passed = (g["status"] == "Active") and (g["filing_status"] == "Up to date") and name_match
        checks.append({
            "check": "gst",
            "passed": bool(passed),
            "status": g["status"],
            "filing_status": g["filing_status"],
            "name_match": bool(name_match)
        })

    # --- PAN check ---
    pan_row = pan_df[pan_df["bidder_id"] == bidder_id]
    if pan_row.empty:
        checks.append({"check": "pan", "passed": False, "detail": "No PAN record found"})
    else:
        p = pan_row.iloc[0]
        name_match = p["name_on_pan"].strip().lower() == bidder["company_name"].strip().lower()
        passed = (p["it_compliance_status"] == "Compliant") and name_match
        checks.append({
            "check": "pan",
            "passed": bool(passed),
            "it_compliance_status": p["it_compliance_status"],
            "name_match": bool(name_match)
        })

    # --- Udyam check ---
    udyam_row = udyam_df[udyam_df["bidder_id"] == bidder_id]
    if udyam_row.empty:
        checks.append({"check": "udyam", "passed": False, "detail": "No Udyam record found"})
    else:
        u = udyam_row.iloc[0]
        passed = u["status"] == "Active"
        checks.append({
            "check": "udyam",
            "passed": bool(passed),
            "status": u["status"]
        })

    # --- Blacklist check ---
    bl_row = blacklist_df[blacklist_df["bidder_id"] == bidder_id]
    if bl_row.empty:
        checks.append({"check": "blacklist", "passed": True, "status": "Clear"})
    else:
        b = bl_row.iloc[0]
        passed = b["status"] != "Blacklisted"
        checks.append({
            "check": "blacklist",
            "passed": bool(passed),
            "status": b["status"],
            "reason": b.get("reason", None) if not passed else None
        })

    overall_eligible = all(c["passed"] for c in checks)

    return {
        "bidder_id": bidder_id,
        "overall_eligible": overall_eligible,
        "checks": checks
    }

from datetime import datetime

def verify_certificate_against_records(bidder_id: str, extracted: dict) -> dict:
    """
    Cross-checks fields extracted from an uploaded certificate PDF against:
    1. The matching mock govt portal record (does the cert agree with the portal?)
    2. The certificate's own internal validity (e.g. expiry date already passed)
    """
    doc_type = extracted.get("document_type")
    checks = []

    if doc_type == "gst":
        row = gst_df[gst_df["bidder_id"] == bidder_id]
        if row.empty:
            checks.append({"check": "portal_match", "passed": False, "detail": "No GST portal record for this bidder"})
        else:
            g = row.iloc[0]
            gstin_match = extracted.get("gstin") == g["gstin"]
            name_match = (extracted.get("legal_name") or "").strip().lower() == g["registered_name"].strip().lower()
            checks.append({
                "check": "portal_match",
                "passed": bool(gstin_match and name_match),
                "gstin_match": bool(gstin_match),
                "name_match": bool(name_match),
                "certificate_name": extracted.get("legal_name"),
                "portal_name": g["registered_name"],
            })

    elif doc_type == "udyam":
        row = udyam_df[udyam_df["bidder_id"] == bidder_id]
        if row.empty:
            checks.append({"check": "portal_match", "passed": False, "detail": "No Udyam portal record for this bidder"})
        else:
            u = row.iloc[0]
            number_match = extracted.get("udyam_number") == u["udyam_number"]
            name_match = (extracted.get("enterprise_name") or "").strip().lower() == u["registered_name"].strip().lower()
            checks.append({
                "check": "portal_match",
                "passed": bool(number_match and name_match),
                "number_match": bool(number_match),
                "name_match": bool(name_match),
            })

        # The certificate's OWN claimed expiry — independent of what the portal says.
        # This is the interesting case: a cert can claim a future valid-upto date
        # that has since passed, catching a stale/expired document even if
        # someone forgot to check the date manually.
        valid_upto_str = extracted.get("valid_upto")
        if valid_upto_str:
            try:
                valid_upto_date = datetime.strptime(valid_upto_str, "%Y-%m-%d")
                expired = valid_upto_date < datetime.now()
                checks.append({
                    "check": "certificate_expiry",
                    "passed": not expired,
                    "valid_upto": valid_upto_str,
                })
            except ValueError:
                checks.append({"check": "certificate_expiry", "passed": False, "detail": "Could not parse valid_upto date"})
    if doc_type == "unknown" and not checks:
        checks.append({
            "check": "document_type",
            "passed": False,
            "detail": "Unrecognized certificate type — expected a GST or Udyam registration certificate"
        })
    return {
        "document_type": doc_type,
        "checks": checks,
        "all_passed": all(c["passed"] for c in checks) if checks else False,
    }
if __name__ == "__main__":
    gst_df = pd.read_csv(os.path.join(DATA_DIR, "gst_portal.csv"))
    pan_df = pd.read_csv(os.path.join(DATA_DIR, "pan_portal.csv"))
    udyam_df = pd.read_csv(os.path.join(DATA_DIR, "udyam_portal.csv"))
    blacklist_df = pd.read_csv(os.path.join(DATA_DIR, "blacklist_registry.csv"))
    
    print("GST status values:", gst_df["status"].unique())
    print("GST filing_status values:", gst_df["filing_status"].unique())
    print("PAN it_compliance_status values:", pan_df["it_compliance_status"].unique())
    print("Udyam status values:", udyam_df["status"].unique())
    print("Blacklist status values:", blacklist_df["status"].unique())

