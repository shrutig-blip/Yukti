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


