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
- GitHub setup: branch protection on `main` (PR required, `backend-check` CI required, branches must be up to date)
- Workflow: no direct commits to `main` — always feature branch → PR → merge

### Next Steps (pick these up first)
1. **PDF extraction module** — build the AI/OCR piece that reads the 3 sample tender PDFs and auto-extracts bidder-relevant fields (this is a separate, meatier chunk of work — needs its own scoping)
2. **Frontend** — currently empty (`/frontend`); needs a basic UI to search a bidder, pick a tender, and show the compliance result from the `/compliance/{bidder_id}/{tender_id}` endpoint---->abhi pura frontend mt start krna...
