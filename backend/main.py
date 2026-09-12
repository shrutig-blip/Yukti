from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import shutil, tempfile, os
import data_loader
from pdf_extractor import extract_text_from_pdf, extract_certificate_fields
from data_loader import verify_certificate_against_records

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

@app.get("/audit/recent-activity")
def get_recent_activity(limit: int = 10):
    return data_loader.get_recent_verification_activity(limit=limit)

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
    finally:
        os.remove(tmp_path)

    verification = verify_certificate_against_records(bidder_id, extracted)

    return {
        "bidder_id": bidder_id,
        "extracted": extracted,
        "verification": verification,
    }
