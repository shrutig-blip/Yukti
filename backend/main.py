from fastapi import FastAPI, HTTPException
import data_loader

app = FastAPI()
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
    return result

@app.get("/verify/{bidder_id}")
def read_bidder_credentials(bidder_id: str):
    result = data_loader.verify_bidder_credentials(bidder_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Bidder not found")
    return result