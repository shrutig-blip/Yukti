# Yukti

### Backend url: https://yukti-xzni.onrender.com/
### Frontend url: https://yukti-beryl.vercel.app/
## Tech Stack

- **Backend:** Python + FastAPI
- **Data:** CSV-based (pandas), stored in `/data/data/` — bidders, tender criteria, tender bids, mock govt portals (GST, PAN, Udyam, blacklist registry, startup/NSIC, EPFO/ESIC), sample PDFs for AI-extraction demo
- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS

## Project Structure

```
Yukti/
├── backend/          FastAPI app, data loading, compliance/scoring logic, PDF extraction
├── frontend/         React app (Vite + TS + Tailwind)
├── data/             CSV datasets used by the backend
├── docs/             Project documentation
└── .github/workflows CI (backend-check)
```

## Status: Frontend and backend are integrated

## Backend

### Endpoints

| Endpoint | Description |
|---|---|
| `GET /bidder/{bidder_id}` | Returns a single bidder's details |
| `GET /bidders` | Lists all bidders |
| `GET /tender/{tender_id}/criteria` | Returns eligibility criteria for a tender |
| `GET /tenders` | Lists all tenders |
| `GET /tender/{tender_id}/bidders` | Returns all bidders/bids for a given tender |
| `GET /bids` | Lists all bids |
| `GET /compliance/{bidder_id}/{tender_id}` | Core compliance-check engine + aggregate compliance/risk score (see below) |
| `GET /verify/{bidder_id}` | Cross-verifies a bidder's GST, PAN, and Udyam registration against mock govt portal data, and checks the blacklist registry; returns `overall_eligible` + per-check breakdown |
| `POST /verify/{bidder_id}/certificate` | Accepts an uploaded GST/Udyam certificate PDF, extracts text (direct extraction with OCR fallback for scanned documents), pulls structured fields, and cross-checks them against the bidder's mock portal record |

CORS is enabled for local Vite dev servers (`localhost:3000`, `localhost:5173` and their `127.0.0.1` equivalents); an additional origin can be set via the `FRONTEND_ORIGIN` environment variable for deployed frontends.

### Compliance & risk scoring — grounding

Individual eligibility checks (turnover, local-content %, category, MSME-only rules) remain strict pass/fail, per real rules:
- **DPIIT startup relaxation** under **GFR Rule 173** — startups (flagged via registration date, <10 yrs) get turnover/experience exemption where a tender allows it.
- **Udyam/MSME notification** rules for MSME-reserved tenders.
- **CVC blacklisting guidance** for the blacklist-registry check.

The **aggregate** compliance/risk score (`complianceScore`, `riskLevel`, etc., consumed by the frontend) is a separate, documented layer on top of those pass/fail checks — it does not alter or override them. It follows a weighted-scoring model based on the same principle as GeM's own QCBS composite scoring and standard vendor-risk-management practice (`Risk = Likelihood × Impact`, weighted by category). The full rationale and exact weights are documented in code comments directly above `calculate_compliance_score()` in `backend/data_loader.py`, so they can be explained and defended to judges or reviewers without guessing at intent.

### PDF extraction

`pdf_extractor.py` does regex-based certificate field extraction with an OCR fallback (pytesseract) for scanned documents — tested against 3 sample certificates in `backend/test_data/`. Remaining work: finish Tesseract/Poppler OCR install and test the OCR fallback on an actual scanned sample; handle additional certificate types as they come up.

## Frontend

17 components across dashboard, tenders, bidders, compliance, audit, comparison, and reports (built via Google AI Studio, UI polish complete).

### What's real vs. mock

**Wired to the real backend** (via `frontend/src/services/apiClient.ts`, a shared `fetch()` wrapper with a field-mapping layer to reconcile backend field names like `bidder_id`/`company_name` with frontend types like `id`/`name`):
- `bidderService.ts`
- `tenderService.ts`
- `complianceService.ts`
- `verificationService.ts`

**Still on mock data — no backend exists for these yet:**
- `documentService.ts` (document vault)
- `riskService.ts`
- `auditService.ts` (audit trail)
- Reports beyond the compliance report view

Components consuming the real services (e.g. `BidderProfileView.tsx`, `ComplianceAnalysisView.tsx`, `ComplianceReportView.tsx`) handle async loading states, since real network calls aren't instant like the old mock methods were.

### API base URL

`apiClient.ts` defaults to `http://localhost:8000`. Override by setting `VITE_API_BASE_URL` in a `.env` file — see `frontend/.env.example`.

## Local Setup

### Backend

```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```
Server runs at `http://127.0.0.1:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```
App runs at `http://localhost:5173`.

### Known issue: Windows Smart App Control blocks pandas

On some Windows machines with **Smart App Control** turned on (Settings → Windows Security → App & browser control), importing `pandas` fails with:
```
ImportError: DLL load failed while importing timezones: An Application Control policy has blocked this file.
```
This is a Windows security policy, not a bug in this repo — pandas' compiled C-extension DLLs get blocked. Smart App Control cannot be disabled once active without a full Windows reset. If you hit this:
- Run the backend inside **WSL** instead of native Windows Python — WSL is a separate Linux kernel unaffected by this policy, and `localhost` from Windows still reaches a WSL2-hosted server:
  ```bash
  wsl --install
  cd /mnt/c/path/to/Yukti/backend
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  uvicorn main:app --reload
  ```
- Or verify against the CI's `backend-check` run (GitHub-hosted Linux runner, unaffected by local Windows policy) instead of running locally.

## Team Workflow

- Branch protection is enabled on `main`: PR required, `backend-check` CI required to pass, branches must be up to date before merge.
- **No direct commits to `main`** — always feature branch → PR → merge.

## Next Steps

1. Finish Tesseract/Poppler OCR install and test the OCR fallback on an actual scanned certificate.
2. Backend support for document vault, audit trail, and full reports — currently frontend-only mock data.
3. End-to-end manual verification pass: run backend + frontend together, click through bidder/tender/compliance/verification flows, confirm no CORS errors and real data renders (Network tab should show `200` responses from `127.0.0.1:8000`).
