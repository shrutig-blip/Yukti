# Yukti

### Tech Stack
- Backend: Python + FastAPI
- Data: CSV-based (pandas), stored in `/data/data/` (bidders, tender_criteria, tender_bids, mock govt portals, sample PDFs for AI-extraction)

### Completed
- Dataset finalized: 150 bidders, 6 mock govt portals, tender criteria & bids, 3 sample PDFs for extraction demo
- `backend/data_loader.py`: loads all CSVs, provides helper functions to fetch bidder/tender data
- `GET /bidder/{bidder_id}` — returns a single bidder's details
- `GET /tender/{tender_id}/criteria` — returns eligibility criteria for a tender
- `GET /compliance/{bidder_id}/{tender_id}` — core compliance-check engine: compares a bidder against a tender's turnover, local-content %, category, and MSME-only rules
- Added `is_startup` flag to bidder dataset (based on registration date, <10 yrs) to support DPIIT startup relaxation logic (GFR Rule 173 — startups get full turnover/experience exemption when a tender allows it)
- `GET /verify/{bidder_id}` — cross-verifies bidder's GST, PAN, and Udyam registration against mock govt portal data (checks active/compliant status + name match) and checks blacklist registry; returns `overall_eligible` + per-check breakdown
- `GET /verify/{bidder_id}` — cross-verifies bidder's GST, PAN, and Udyam registration against mock govt portal data (checks active/compliant status + name match) and checks blacklist registry; returns `overall_eligible` + per-check breakdown
- `POST /verify/{bidder_id}/certificate` — accepts an uploaded GST/Udyam registration certificate PDF, extracts text (direct extraction with OCR fallback for scanned documents), pulls structured fields via pattern matching, and cross-checks them against the bidder's mock govt portal record (GSTIN/name/registration-number match) plus certificate's own validity (e.g. expiry date); returns extracted fields + per-check verification breakdown
- GitHub setup: branch protection on `main` (PR required, `backend-check` CI required, branches must be up to date)
- Workflow: no direct commits to `main` — always feature branch → PR → merge

### Next Steps (pick these up first)
1. 1. PDF extraction module — core flow built and tested (direct text extraction, GST/Udyam field extraction, portal cross-verification, unrecognized-document handling — all verified against 3 sample certificates). Remaining: finish Tesseract/Poppler OCR install + test OCR fallback on an actual scanned sample; handle additional certificate types as they come up.
2. Frontend — basic UI to search a bidder/tender and show compliance + verification results---->abhi pura frontend mt start krna...
