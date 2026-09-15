"""
Continuous Compliance Monitoring
================================
Everything the rest of this codebase does today checks a bidder ONCE, at bid
time (verify_bidder_credentials() in data_loader.py). That's a one-time
gate: a bidder who was clean at award can go non-compliant six months into
a running contract (GST filing lapses, gets blacklisted, EPFO dues go
unpaid) and nothing here would ever notice, because nothing re-checks them.

This module adds the missing piece: a periodic re-check of every bidder who
is currently in an ACTIVE / AWARDED contract (not just "has bid"), a diff
against their last known compliance snapshot, and an alert the moment a
bidder flips from compliant to non-compliant on any statutory check. It is
deliberately a separate module (not more functions bolted onto
data_loader.py) so this new, still-evolving feature can't destabilize the
existing bid-time verification flow — it only *reads* from data_loader
(verify_bidder_credentials, get_bidder_by_id, append_audit_event) and never
modifies it.

Design notes / grounding:
- "Which bidders are under an active contract?" — there is no
  contract_status field in bidders.csv, and adding one would mean editing a
  shared data file every other teammate's code also reads. Instead this
  reuses data that already exists and is already persisted: a bidder with a
  QUALIFIED officer decision (officer_decisions.csv, see
  data_loader.record_officer_decision) has been awarded / cleared for
  contract execution. That's the same signal the dashboard already shows
  as "Qualified", so "under continuous monitoring" == "latest officer
  decision is QUALIFIED" — no schema change, no new column for every other
  feature to keep in sync with.
- Persistence follows the exact pattern audit_events.csv and
  officer_decisions.csv already use elsewhere in this codebase: an
  append-only CSV kept in sync with an in-memory DataFrame, so history
  survives a server restart without introducing a new database dependency
  for what is still a CSV-based prototype.
- Change detection is a straightforward pass -> fail diff per check
  (gst, pan, mca21, udyam, blacklist, epfo_esic) against that bidder's most
  recent prior snapshot. NSIC is informational-only in
  verify_bidder_credentials (always passed=True there), so it never
  produces a lapse here either — consistent with how it's already treated
  as non-gating.
- A detected lapse is written twice: once into compliance_lapses.csv (a
  structured record the dashboard can list / badge / filter), and once into
  the existing audit trail via data_loader.append_audit_event (event type
  COMPLIANCE_LAPSE), so it shows up in a bidder's existing audit log/timeline
  without duplicating that plumbing.
"""

import json
import os
from datetime import datetime
from typing import Optional

import pandas as pd

import data_loader
from data_loader import DATA_DIR, get_bidder_by_id, verify_bidder_credentials, append_audit_event

# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------

SNAPSHOTS_PATH = os.path.join(DATA_DIR, "compliance_snapshots.csv")
_SNAPSHOT_COLUMNS = [
    "id", "bidder_id", "timestamp", "trigger", "overall_eligible", "checks_json",
]

LAPSES_PATH = os.path.join(DATA_DIR, "compliance_lapses.csv")
_LAPSE_COLUMNS = [
    "id", "bidder_id", "timestamp", "check_type", "previous_status",
    "current_status", "detail", "snapshot_id", "acknowledged",
    "acknowledged_by", "acknowledged_at",
]

if not os.path.exists(SNAPSHOTS_PATH):
    pd.DataFrame(columns=_SNAPSHOT_COLUMNS).to_csv(SNAPSHOTS_PATH, index=False)
if not os.path.exists(LAPSES_PATH):
    pd.DataFrame(columns=_LAPSE_COLUMNS).to_csv(LAPSES_PATH, index=False)

snapshots_df = pd.read_csv(SNAPSHOTS_PATH)
lapses_df = pd.read_csv(LAPSES_PATH)


def _clean_nan(d: dict) -> dict:
    return {k: (None if isinstance(v, float) and pd.isna(v) else v) for k, v in d.items()}


# ---------------------------------------------------------------------------
# Who is under continuous monitoring
# ---------------------------------------------------------------------------

def get_monitored_bidders():
    """Bidders whose latest officer decision is QUALIFIED — i.e. currently
    in an active/awarded contract, not merely a past bidder. Returns a list
    of {bidder_id, company_name, qualified_since} dicts."""
    decisions = data_loader.officer_decisions_df
    if decisions.empty:
        return []

    latest_per_bidder = (
        decisions.sort_values("timestamp").groupby("bidder_id").tail(1)
    )
    active = latest_per_bidder[latest_per_bidder["decision"] == "QUALIFIED"]

    result = []
    for _, row in active.iterrows():
        bidder = get_bidder_by_id(row["bidder_id"])
        if bidder is None:
            continue
        result.append({
            "bidder_id": row["bidder_id"],
            "company_name": bidder["company_name"],
            "qualified_since": row["timestamp"],
        })
    return result


def is_monitored(bidder_id: str) -> bool:
    decision = data_loader.get_officer_decision(bidder_id)
    return bool(decision and decision.get("decision") == "QUALIFIED")


# ---------------------------------------------------------------------------
# Snapshots
# ---------------------------------------------------------------------------

def _persist_snapshot(row: dict):
    global snapshots_df
    snapshots_df = pd.concat([snapshots_df, pd.DataFrame([row])], ignore_index=True)
    pd.DataFrame([row]).to_csv(SNAPSHOTS_PATH, mode="a", header=False, index=False)


def get_latest_snapshot(bidder_id: str) -> Optional[dict]:
    rows = snapshots_df[snapshots_df["bidder_id"] == bidder_id]
    if rows.empty:
        return None
    latest = rows.sort_values("timestamp").iloc[-1]
    record = _clean_nan(latest.to_dict())
    record["checks"] = json.loads(record.pop("checks_json"))
    return record


def get_snapshot_history(bidder_id: str):
    """Every snapshot ever taken for this bidder, newest first — lets the
    dashboard plot a compliance-over-time view instead of just the latest
    point-in-time result."""
    rows = snapshots_df[snapshots_df["bidder_id"] == bidder_id]
    records = []
    for _, row in rows.iterrows():
        record = _clean_nan(row.to_dict())
        record["checks"] = json.loads(record.pop("checks_json"))
        records.append(record)
    records.sort(key=lambda r: r["timestamp"], reverse=True)
    return records


# ---------------------------------------------------------------------------
# Lapses
# ---------------------------------------------------------------------------

def _persist_lapse(row: dict):
    global lapses_df
    lapses_df = pd.concat([lapses_df, pd.DataFrame([row])], ignore_index=True)
    pd.DataFrame([row]).to_csv(LAPSES_PATH, mode="a", header=False, index=False)


def get_lapses(bidder_id: Optional[str] = None, acknowledged: Optional[bool] = None):
    rows = lapses_df
    if bidder_id is not None:
        rows = rows[rows["bidder_id"] == bidder_id]
    if acknowledged is not None:
        rows = rows[rows["acknowledged"].astype(bool) == acknowledged]
    records = [_clean_nan(row.to_dict()) for _, row in rows.iterrows()]
    records.sort(key=lambda r: r["timestamp"], reverse=True)
    return records


def acknowledge_lapse(lapse_id: str, officer_name: str):
    """Marks a lapse as reviewed by a procurement officer. Rewrites the
    small lapses CSV in place (same pattern update_tender_requirement()
    already uses for tender_criteria.csv) since, unlike snapshots/audit
    events, an acknowledgement is an edit to an existing row, not a new
    append-only fact."""
    global lapses_df
    match = lapses_df["id"] == lapse_id
    if not match.any():
        return None
    lapses_df.loc[match, "acknowledged"] = True
    lapses_df.loc[match, "acknowledged_by"] = officer_name
    lapses_df.loc[match, "acknowledged_at"] = datetime.now().isoformat()
    lapses_df.to_csv(LAPSES_PATH, index=False)
    return _clean_nan(lapses_df.loc[match].iloc[0].to_dict())


# ---------------------------------------------------------------------------
# The actual re-check
# ---------------------------------------------------------------------------

def _diff_checks(previous_checks, current_checks):
    """Returns the list of checks that were passing before and are failing
    now — i.e. genuine lapses, not just "still non-compliant" or
    "newly resolved". A check that didn't exist in the previous snapshot
    (e.g. a portal integration added later) is never treated as a lapse —
    there's nothing to have lapsed from."""
    prev_by_name = {c["check"]: c for c in previous_checks}
    lapses = []
    for check in current_checks:
        name = check["check"]
        prev = prev_by_name.get(name)
        if prev is None:
            continue
        if prev.get("passed") and not check.get("passed"):
            lapses.append({
                "check_type": name,
                "previous_status": _status_label(prev),
                "current_status": _status_label(check),
                "detail": check.get("detail") or _default_lapse_detail(check),
            })
    return lapses


def _status_label(check: dict) -> str:
    if "status" in check and check["status"] is not None:
        return str(check["status"])
    if "filing_status" in check and check["filing_status"] is not None:
        return str(check["filing_status"])
    return "Compliant" if check.get("passed") else "Non-compliant"


def _default_lapse_detail(check: dict) -> str:
    return f"{check['check']} check, previously passing, is now failing"


def recheck_bidder(bidder_id: str, trigger: str = "manual"):
    """Re-runs the same verify_bidder_credentials() used at bid time,
    diffs the result against this bidder's last snapshot, persists the new
    snapshot, and — if anything that was passing is now failing — persists
    a COMPLIANCE_LAPSE for each and writes it into the existing audit
    trail. Returns None only if the bidder itself doesn't exist (mirrors
    every other lookup function in data_loader.py)."""
    result = verify_bidder_credentials(bidder_id)
    if result is None:
        return None

    previous = get_latest_snapshot(bidder_id)
    lapses = _diff_checks(previous["checks"], result["checks"]) if previous else []

    snapshot_id = f"SNAP-{len(snapshots_df) + 1}"
    snapshot_row = {
        "id": snapshot_id,
        "bidder_id": bidder_id,
        "timestamp": datetime.now().isoformat(),
        "trigger": trigger,
        "overall_eligible": result["overall_eligible"],
        "checks_json": json.dumps(result["checks"]),
    }
    _persist_snapshot(snapshot_row)

    persisted_lapses = []
    for lapse in lapses:
        lapse_id = f"LAPSE-{len(lapses_df) + 1}"
        lapse_row = {
            "id": lapse_id,
            "bidder_id": bidder_id,
            "timestamp": snapshot_row["timestamp"],
            "check_type": lapse["check_type"],
            "previous_status": lapse["previous_status"],
            "current_status": lapse["current_status"],
            "detail": lapse["detail"],
            "snapshot_id": snapshot_id,
            "acknowledged": False,
            "acknowledged_by": None,
            "acknowledged_at": None,
        }
        _persist_lapse(lapse_row)
        persisted_lapses.append(_clean_nan(lapse_row))

        bidder = get_bidder_by_id(bidder_id)
        append_audit_event(
            bidder_id=bidder_id,
            actor="Continuous Compliance Monitor",
            role="Automated Integration",
            action=f"COMPLIANCE_LAPSE: {lapse['check_type']} ({lapse['previous_status']} -> {lapse['current_status']})",
            source="continuous_compliance.recheck_bidder()",
            result="LAPSE_DETECTED",
            evidence_ref=lapse_id,
            comments=lapse["detail"],
        )

    return {
        "bidder_id": bidder_id,
        "snapshot_id": snapshot_id,
        "timestamp": snapshot_row["timestamp"],
        "overall_eligible": result["overall_eligible"],
        "checks": result["checks"],
        "lapses_detected": persisted_lapses,
        "is_first_check": previous is None,
    }


def run_sweep(trigger: str = "scheduled"):
    """Re-checks every currently-monitored (QUALIFIED) bidder in one pass.
    This is what the scheduled background job calls, and it's also exposed
    as a manual POST /monitoring/run for demoing the feature without
    waiting for the interval to elapse."""
    monitored = get_monitored_bidders()
    results = []
    total_lapses = 0
    for entry in monitored:
        outcome = recheck_bidder(entry["bidder_id"], trigger=trigger)
        if outcome is None:
            continue
        total_lapses += len(outcome["lapses_detected"])
        results.append(outcome)

    return {
        "run_at": datetime.now().isoformat(),
        "trigger": trigger,
        "bidders_checked": len(results),
        "lapses_detected": total_lapses,
        "results": results,
    }
