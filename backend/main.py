from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil, tempfile, os
import data_loader
from pdf_extractor import extract_text_from_pdf, extract_certificate_fields
from data_loader import verify_certificate_against_records
from document_integrity import get_document_integrity
from auth import (
    RegisterRequest, LoginRequest, TokenResponse, UserOut,
    get_user_by_email, create_user, verify_password, create_access_token,
    get_current_user, to_user_out,
)
from typing import Optional, List
from groq import Groq
from dotenv import load_dotenv

# Loads variables from backend/.env (if present) into the environment —
# this is the PERMANENT fix so you never have to set the API key
# manually in every new terminal again.
load_dotenv()

# Free API key from https://console.groq.com/keys (no billing needed).
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

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
    return criteria

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
        integrity = get_document_integrity(tmp_path)
    finally:
        os.remove(tmp_path)

    verification = verify_certificate_against_records(bidder_id, extracted)

    return {
        "bidder_id": bidder_id,
        "extracted": extracted,
        "verification": verification,
        "document_integrity": integrity,
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

@app.post("/tender")
def create_tender(tender: TenderCreateIn):
    result = data_loader.create_tender(tender.model_dump())
    if result is None:
        raise HTTPException(status_code=409, detail="A tender with this tender_id already exists")
    return result

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
        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1200,
        )
        letter_text = response.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI letter generation failed: {e}")

    return {"letter": letter_text}