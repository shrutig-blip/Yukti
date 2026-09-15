from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil, tempfile, os
import data_loader
import continuous_compliance
from pdf_extractor import extract_text_from_pdf, extract_certificate_fields, analyze_document_integrity, extract_nit_requirements
from data_loader import verify_certificate_against_records
from auth import (
    RegisterRequest, LoginRequest, TokenResponse, UserOut,
    get_user_by_email, create_user, verify_password, create_access_token,
    get_current_user, to_user_out,
)
from typing import Optional, List
from groq import Groq
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler

# Loads variables from backend/.env (if present) into the environment —
# this is the PERMANENT fix so you never have to set the API key
# manually in every new terminal again.
load_dotenv()

# Free API key from https://console.groq.com/keys (no billing needed).
# NOTE: the client is created lazily inside the endpoint (not here at
# import time) so that importing this module never fails just because
# GROQ_API_KEY isn't set — e.g. in CI, where there's no .env file.
def _get_groq_client() -> Groq:
    return Groq(api_key=os.environ.get("GROQ_API_KEY"))

app = FastAPI()

_default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_extra_origin = os.environ.get("FRONTEND_ORIGIN")
if _extra_origin:
    _default_origins.append(_extra_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Continuous Compliance — scheduled re-check job
# ---------------------------------------------------------------------------
# Bid-time verification (/verify/{bidder_id}) is a one-time gate. This job
# is what makes compliance an ongoing concern: every
# COMPLIANCE_RECHECK_INTERVAL_HOURS (default 24h — override via env var,
# e.g. set it low for a demo), it re-runs verify_bidder_credentials() for
# every bidder currently under an awarded/active contract (QUALIFIED
# officer decision) and raises a COMPLIANCE_LAPSE the moment someone who
# was passing starts failing. See continuous_compliance.py for the full
# design rationale. The scheduler starts with the app and stops with it;
# POST /monitoring/run exists alongside it so the feature can be demoed
# on demand instead of waiting for the interval to elapse.
_RECHECK_INTERVAL_HOURS = float(os.environ.get("COMPLIANCE_RECHECK_INTERVAL_HOURS", 24))
_scheduler = BackgroundScheduler()
_scheduler.add_job(
    lambda: continuous_compliance.run_sweep(trigger="scheduled"),
    "interval",
    hours=_RECHECK_INTERVAL_HOURS,
    id="continuous_compliance_sweep",
    next_run_time=None,  # don't fire the instant the app boots; wait one interval
)


@app.on_event("startup")
def _start_compliance_scheduler():
    if not _scheduler.running:
        _scheduler.start()


@app.on_event("shutdown")
def _stop_compliance_scheduler():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)


@app.get("/")
def home():
    return {"message": "GeM Compliance API is running"}

@app.get("/bidder/{bidder_id}")
def read_bidder(bidder_id: str):
    bidder = data_loader.get_bidder_by_id(bidder_id)
    if bidder is None:
        raise HTTPException(status_code=404, detail="Bidder not found")
    return bidder

@app.get("/tender/{tender_id}/criteria")
def read_tender_criteria(tender_id: str):
    criteria = data_loader.get_criteria_by_tender(tender_id)
    if criteria is None:
        raise HTTPException(status_code=404, detail="Tender not found")
    # Fixed-schema criteria (unchanged) plus any extensible custom criteria
    # defined for this tender, so a single GET gives the full picture.
    return {**criteria, "custom_criteria": data_loader.get_custom_criteria(tender_id)}


# ---------------------------------------------------------------------------
# Generic / extensible tender-criterion model
# ---------------------------------------------------------------------------
# See the "Generic / extensible tender-criterion model" block in
# data_loader.py for the full design rationale. This lets a tender gain a
# brand-new kind of eligibility rule (any bidder field + operator + value)
# without a schema migration or backend code change.

class CustomCriterionIn(BaseModel):
    label: str
    field: str  # any column on bidders.csv, e.g. "annual_turnover_cr", "state"
    operator: str  # one of >=, <=, >, <, ==, !=, in, contains
    value: str
    mandatory: bool = True
    weight: float = 1.0
    rule_reference: Optional[str] = None


@app.get("/tender/{tender_id}/criteria/custom")
def read_custom_criteria(tender_id: str):
    if data_loader.get_criteria_by_tender(tender_id) is None:
        raise HTTPException(status_code=404, detail="Tender not found")
    return data_loader.get_custom_criteria(tender_id)


@app.post("/tender/{tender_id}/criteria/custom")
def create_custom_criterion(tender_id: str, criterion: CustomCriterionIn):
    try:
        result = data_loader.add_custom_criterion(tender_id, criterion.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if result is None:
        raise HTTPException(status_code=404, detail="Tender not found")
    return result


@app.delete("/tender/{tender_id}/criteria/custom/{criterion_id}")
def remove_custom_criterion(tender_id: str, criterion_id: int):
    deleted = data_loader.delete_custom_criterion(tender_id, criterion_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Criterion not found")
    return {"deleted": True, "id": criterion_id}

@app.get("/compliance/{bidder_id}/{tender_id}")
def read_compliance(bidder_id: str, tender_id: str):
    result = data_loader.check_compliance(bidder_id, tender_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Bidder or Tender not found")

    scoring = data_loader.calculate_compliance_score(bidder_id, tender_id)
    if scoring is not None:
        result.update(scoring)
    return result

@app.get("/tenders")
def read_tenders():
    return data_loader.list_tenders()

@app.get("/bidders")
def read_bidders():
    return data_loader.list_bidders()

@app.get("/tender/{tender_id}/bidders")
def read_bidders_for_tender(tender_id: str):
    result = data_loader.get_bidders_by_tender(tender_id)
    if result is None:
        raise HTTPException(status_code=404, detail="No bids found for this tender")
    return result

@app.get("/bids")
def read_bids():
    return data_loader.list_bids()

@app.get("/verify/{bidder_id}")
def read_bidder_credentials(bidder_id: str):
    result = data_loader.verify_bidder_credentials(bidder_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Bidder not found")
    return result

# ---------------------------------------------------------------------------
# MCA21 (Ministry of Corporate Affairs) integration
# ---------------------------------------------------------------------------
# Treated like the existing GST/PAN endpoints: a raw-record lookup plus a
# standalone verification check. Already also folded into the combined
# /verify/{bidder_id} response (see verify_bidder_credentials in
# data_loader.py) — these two endpoints exist for callers that want MCA21
# on its own, same as GST/PAN don't have standalone endpoints today but
# MCA21 was specifically requested to.

@app.get("/mca21/{bidder_id}")
def read_mca21_record(bidder_id: str):
    result = data_loader.get_mca21_details(bidder_id)
    if result is None:
        raise HTTPException(status_code=404, detail="No MCA21 record found for this bidder")
    return result


@app.get("/verify/{bidder_id}/mca21")
def read_mca21_verification(bidder_id: str):
    result = data_loader.verify_mca21(bidder_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Bidder not found")
    return result


# ---------------------------------------------------------------------------
# DigiLocker document pull
# ---------------------------------------------------------------------------
# See fetch_digilocker_bundle() in data_loader.py for the real-vs-mock
# fallback design. Every successful pull is written to the bidder's audit
# log, same as the certificate-verification flow already does, so a DigiLocker
# fetch shows up in the officer-facing audit trail.

@app.post("/verify/{bidder_id}/digilocker")
def fetch_via_digilocker(bidder_id: str):
    result = data_loader.fetch_digilocker_bundle(bidder_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Bidder not found")

    doc_count = len(result.get("documents", result.get("raw", {})))
    data_loader.append_audit_event(
        bidder_id=bidder_id,
        actor="System",
        role="Automated Integration",
        action="DigiLocker document pull",
        source=f"DigiLocker ({result['source']})",
        result="Success",
        evidence_ref=result.get("issuer_pull_endpoint"),
        comments=f"{doc_count} document(s) retrieved",
    )
    return result


class AuditEventIn(BaseModel):
    actor: str
    role: str
    action: str
    source: str
    result: str
    evidence_ref: str | None = None
    comments: str | None = None

@app.post("/bidder/{bidder_id}/audit-log")
def write_audit_event(bidder_id: str, event: AuditEventIn):
    if data_loader.get_bidder_by_id(bidder_id) is None:
        raise HTTPException(status_code=404, detail="Bidder not found")
    return data_loader.append_audit_event(
        bidder_id=bidder_id,
        actor=event.actor,
        role=event.role,
        action=event.action,
        source=event.source,
        result=event.result,
        evidence_ref=event.evidence_ref,
        comments=event.comments,
    )

@app.get("/bidder/{bidder_id}/audit-log")
def read_audit_log(bidder_id: str):
    result = data_loader.get_audit_log(bidder_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Bidder not found")
    return result

@app.get("/bidder/{bidder_id}/risk-factors")
def read_risk_factors(bidder_id: str, tender_id: Optional[str] = None):
    result = data_loader.get_risk_factors(bidder_id, tender_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Bidder not found")
    return result

@app.get("/bidder/{bidder_id}/expiries")
def read_expiries(bidder_id: str):
    result = data_loader.get_expiries(bidder_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Bidder not found")
    return result


@app.get("/audit/recent-activity")
def get_recent_activity(limit: int = 10):
    return data_loader.get_recent_verification_activity(limit=limit)

@app.get("/auth/me", response_model=UserOut)
def me(current_user: dict = Depends(get_current_user)):
    return to_user_out(current_user)

@app.post("/verify/{bidder_id}/certificate")
async def verify_certificate(bidder_id: str, file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
       raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        raw_text = extract_text_from_pdf(tmp_path)
        extracted = extract_certificate_fields(raw_text)
        document_integrity = analyze_document_integrity(tmp_path)
    finally:
        os.remove(tmp_path)

    verification = verify_certificate_against_records(bidder_id, extracted)

    return {
        "bidder_id": bidder_id,
        "extracted": extracted,
        "verification": verification,
        "document_integrity": document_integrity,
    }

@app.post("/auth/register", response_model=UserOut, status_code=201)
def register(payload: RegisterRequest):
    if get_user_by_email(payload.email):
        raise HTTPException(status_code=409, detail="User already exists")
    user = create_user(payload.name, payload.email, payload.password)
    return to_user_out(user)


@app.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    user = get_user_by_email(payload.email)
    if user is None or not verify_password(payload.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user)
    return TokenResponse(message="Login successful", token=token, user=to_user_out(user))

@app.get("/tender/{tender_id}/collusion-signals")
def read_collusion_signals(tender_id: str):
    result = data_loader.get_collusion_signals(tender_id)
    if result is None:
        raise HTTPException(status_code=404, detail="No bids found for this tender")
    return result

@app.get("/bidder/{bidder_id}/timeline")
def read_timeline(bidder_id: str):
    result = data_loader.get_timeline(bidder_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Bidder not found")
    return result


# ---------------------------------------------------------------------------
# Officer decision (Qualify / Disqualify / etc.) — persisted, survives refresh
# ---------------------------------------------------------------------------

class OfficerDecisionIn(BaseModel):
    decision: str  # "QUALIFIED" | "DISQUALIFIED" | "CLARIFICATION_REQUESTED" | "PENDING"
    officer_name: str
    officer_designation: str
    comments: str | None = None
    conditions_or_stipulations: str | None = None

@app.post("/bidder/{bidder_id}/decision")
def create_officer_decision(bidder_id: str, decision: OfficerDecisionIn):
    if data_loader.get_bidder_by_id(bidder_id) is None:
        raise HTTPException(status_code=404, detail="Bidder not found")
    return data_loader.record_officer_decision(
        bidder_id=bidder_id,
        decision=decision.decision,
        officer_name=decision.officer_name,
        officer_designation=decision.officer_designation,
        comments=decision.comments,
        conditions_or_stipulations=decision.conditions_or_stipulations,
    )

@app.get("/bidder/{bidder_id}/decision")
def read_officer_decision(bidder_id: str):
    if data_loader.get_bidder_by_id(bidder_id) is None:
        raise HTTPException(status_code=404, detail="Bidder not found")
    result = data_loader.get_officer_decision(bidder_id)
    if result is None:
        return {"bidder_id": bidder_id, "decision": None}
    return result

@app.get("/decisions")
def read_all_decisions():
    return data_loader.get_all_decisions()

# ---------------------------------------------------------------------------
# Continuous Compliance Monitoring
# ---------------------------------------------------------------------------
# Not a one-time bid-submission gate: this re-runs statutory verification
# for bidders currently under an awarded/active contract (QUALIFIED officer
# decision) and surfaces it the moment a previously-clean bidder lapses
# (blacklisted, GST filing goes overdue, etc.) mid-contract. See
# continuous_compliance.py for the full design/grounding notes and the
# background scheduler set up above that calls run_sweep() automatically.

@app.get("/monitoring/bidders")
def read_monitored_bidders():
    """Bidders currently under continuous compliance monitoring, i.e.
    in an active/awarded contract rather than merely having placed a bid."""
    return continuous_compliance.get_monitored_bidders()


@app.post("/monitoring/{bidder_id}/recheck")
def recheck_bidder_compliance(bidder_id: str):
    """Manually trigger an immediate re-check for one bidder — same logic
    the scheduled sweep runs, just for a single bidder and on demand."""
    result = continuous_compliance.recheck_bidder(bidder_id, trigger="manual")
    if result is None:
        raise HTTPException(status_code=404, detail="Bidder not found")
    return result


@app.post("/monitoring/run")
def run_monitoring_sweep():
    """Manually trigger a full sweep across every monitored bidder, on
    demand — the same job the background scheduler fires automatically
    every COMPLIANCE_RECHECK_INTERVAL_HOURS."""
    return continuous_compliance.run_sweep(trigger="manual")


@app.get("/bidder/{bidder_id}/compliance-history")
def read_compliance_history(bidder_id: str):
    """Every point-in-time compliance snapshot ever taken for this bidder,
    newest first — lets the dashboard show compliance status over the life
    of the contract, not just a single moment."""
    if data_loader.get_bidder_by_id(bidder_id) is None:
        raise HTTPException(status_code=404, detail="Bidder not found")
    return continuous_compliance.get_snapshot_history(bidder_id)


@app.get("/monitoring/lapses")
def read_compliance_lapses(bidder_id: Optional[str] = None, acknowledged: Optional[bool] = None):
    """Detected mid-contract compliance lapses, newest first. Filterable by
    bidder and/or acknowledged status — this is what a dashboard alert
    badge / notification list would query against."""
    return continuous_compliance.get_lapses(bidder_id=bidder_id, acknowledged=acknowledged)


class LapseAcknowledgeIn(BaseModel):
    officer_name: str


@app.post("/monitoring/lapses/{lapse_id}/acknowledge")
def acknowledge_compliance_lapse(lapse_id: str, payload: LapseAcknowledgeIn):
    result = continuous_compliance.acknowledge_lapse(lapse_id, payload.officer_name)
    if result is None:
        raise HTTPException(status_code=404, detail="Lapse not found")
    return result

# ---------------------------------------------------------------------------
# Tender create / requirement edit
# ---------------------------------------------------------------------------

class TenderCreateIn(BaseModel):
    tender_id: str | None = None
    tender_title: str
    category_allowed: str  # e.g. "General;Medium;OEM"
    min_turnover_cr: float
    min_local_content_percent: float
    msme_only: bool = False
    startup_relaxation: bool = False
    department: str | None = None
    deadline: str | None = None
    estimated_value_cr: float | None = None

@app.post("/tender")
def create_tender(tender: TenderCreateIn):
    result = data_loader.create_tender(tender.model_dump())
    if result is None:
        raise HTTPException(status_code=409, detail="A tender with this tender_id already exists")
    return result


_NIT_NUMERIC_FIELDS = {"min_turnover_cr", "min_local_content_percent", "estimated_value_cr"}

def _parse_nit_field(field: str, value):
    """Coerces a raw regex-extracted string into the type the tender_criteria
    dataframe expects for that field. Returns None if it can't be parsed
    cleanly — we'd rather leave a field untouched than write a bad value."""
    if value is None:
        return None
    if field in _NIT_NUMERIC_FIELDS:
        try:
            return float(str(value).replace(",", "").strip())
        except (TypeError, ValueError):
            return None
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


@app.post("/tender/{tender_id}/extract")
async def extract_tender_document(tender_id: str, file: UploadFile = File(...)):
    """Uploads a real NIT PDF, runs it through the same PDF text-extraction
    used for bidder certificates, and — only if that extraction actually
    succeeds — persists a real extracted_date/extracted_filename against the
    tender. It also runs extract_nit_requirements() over the extracted text
    and, for any field it could confidently parse (tender title, turnover,
    local content %, category, deadline, estimated value, MSME-only,
    startup relaxation), writes that value onto the tender's requirement
    record via update_tender_requirement(). Fields the regexes don't find in
    this particular PDF are left exactly as they were — this never blanks
    out an existing value, it only fills in what it actually read."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted (DOCX text extraction isn't implemented yet)")
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        raw_text = extract_text_from_pdf(tmp_path)
    finally:
        os.remove(tmp_path)

    result = data_loader.extract_tender_document(tender_id, file.filename, raw_text)
    if result is None:
        raise HTTPException(status_code=404, detail="Tender not found")

    # Map the NIT-extraction field names onto the tender_criteria column
    # names (they differ for the deadline field), coerce types, and drop
    # anything the regexes didn't find.
    raw_fields = extract_nit_requirements(raw_text or "")
    field_name_map = {
        "tender_title": "tender_title",
        "min_turnover_cr": "min_turnover_cr",
        "min_local_content_percent": "min_local_content_percent",
        "category_allowed": "category_allowed",
        "submission_deadline": "deadline",
        "estimated_value_cr": "estimated_value_cr",
        "msme_only": "msme_only",
        "startup_relaxation": "startup_relaxation",
    }
    updates = {}
    for src_field, dest_field in field_name_map.items():
        parsed = _parse_nit_field(dest_field, raw_fields.get(src_field))
        if parsed is not None:
            updates[dest_field] = parsed

    updated_requirement = result
    if updates:
        updated_requirement = data_loader.update_tender_requirement(tender_id, updates) or result

    return {
        "tender_id": tender_id,
        "filename": file.filename,
        "extracted_date": result["extracted_date"],
        "text_length": len(raw_text or ""),
        "requirements_extracted": updates,
        "requirement": updated_requirement,
    }

class TenderRequirementUpdateIn(BaseModel):
    tender_title: str | None = None
    category_allowed: str | None = None
    min_turnover_cr: float | None = None
    min_local_content_percent: float | None = None
    msme_only: bool | None = None
    startup_relaxation: bool | None = None

@app.patch("/tender/{tender_id}/requirement")
def edit_tender_requirement(tender_id: str, updates: TenderRequirementUpdateIn):
    result = data_loader.update_tender_requirement(
        tender_id, updates.model_dump(exclude_unset=True)
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Tender not found")
    return result


# ---------------------------------------------------------------------------
# AI-drafted clarification letters (Gemini)
# ---------------------------------------------------------------------------

class ContradictionIn(BaseModel):
    field: str
    assessment: str
    sources: List[dict]
    recommendation: str
    severity: str


class LetterRequest(BaseModel):
    bidder_id: str
    bidder_name: str
    bidder_address: Optional[str] = None
    tender_id: str
    tender_title: str
    contradictions: List[ContradictionIn]


@app.post("/generate-clarification-letter")
def generate_clarification_letter(req: LetterRequest):
    """Uses an LLM to draft the clarification letter from REAL detected
    contradictions (passed in by the frontend, already computed from real
    backend data). The model only sees the discrepancies listed below —
    it is explicitly instructed not to invent any facts beyond them."""
    if not req.contradictions:
        raise HTTPException(status_code=400, detail="No discrepancies provided to draft a letter for")

    def format_sources(sources):
        parts = []
        for s in sources:
            source_name = s.get("source", "")
            value = s.get("value", "")
            parts.append(f"{source_name}: {value}")
        return "; ".join(parts)

    bullet_lines = []
    for c in req.contradictions:
        line = (
            f"- {c.field}: {c.assessment} (Severity: {c.severity}). "
            f"Recommendation: {c.recommendation}. "
            f"Evidence: {format_sources(c.sources)}"
        )
        bullet_lines.append(line)
    bullet_points = "\n".join(bullet_lines)

    prompt = f"""You are drafting a formal government procurement clarification letter for CPCL
(Chennai Petroleum Corporation Limited), a public sector undertaking, addressed
to a bidder in a GeM tender process.

Bidder: {req.bidder_name}
Address: {req.bidder_address or "on file with the department"}
Tender ID: {req.tender_id}
Tender Title: {req.tender_title}

The following compliance discrepancies were detected during automated verification:
{bullet_points}

Write a formal, professional clarification letter addressed to the bidder's
authorized signatory. List each discrepancy above as its own numbered point
with a clear request for supporting documentation, and give a 7-working-day
deadline. Use formal Indian government procurement letter conventions (REF,
DATE, TO, SUBJECT, "Dear Sir / Madam", "Yours faithfully"). Do NOT invent any
facts beyond what is listed above. Sign off as "For Chennai Petroleum
Corporation Limited (CPCL)". Return ONLY the letter text, nothing else."""

    try:
        groq_client = _get_groq_client()
        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1200,
        )
        letter_text = response.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI letter generation failed: {e}")

    return {"letter": letter_text}