# Nano Labs

Full-stack starter for clinical report management. Backend is Django REST + JWT over PostgreSQL and frontend is React + Vite + Tailwind.

## Requirements
- Python 3.12+
- Node 18+ with `pnpm`
- PostgreSQL 15+
- (Optional) Docker + Docker Compose

## Setup

### Backend
1. Copy `backend/.env.example` to `backend/.env` and adjust credentials (set `OPENAI_API_KEY` if you want AI-generated insights; leave blank to use rule-based summaries).
2. Install dependencies and prepare the virtualenv (first run creates `.venv`):
   ```bash
   make setup-backend
   ```
3. Apply migrations and run the API:
   ```bash
   make run-backend
   ```
4. Seed default analytes (once):
   ```bash
   make seed
   ```
5. Run backend tests:
   ```bash
   cd backend && ../.venv/bin/pytest
   ```

### Frontend
1. Copy `frontend/.env.example` to `frontend/.env` and point `VITE_API_URL` to the backend URL.
2. Install dependencies and start Vite:
   ```bash
   make run-frontend
   ```

### AI configuration
- Set `OPENAI_API_KEY` in `backend/.env` when you want production-grade AI insights. The upload workflow automatically calls OpenAI's `gpt-4o-mini` model; without a key, the backend falls back to deterministic rule-based summaries so the UI still shows meaningful information.
- No extra frontend configuration is required beyond reloading the app after adding your API key.

### Docker (optional)
```bash
docker compose up --build
```
This launches PostgreSQL, the Django backend (Gunicorn) and PgAdmin.

## Features
- JWT authentication with SimpleJWT (`/api/auth/register/`, `/api/auth/login/`, `/api/auth/token/refresh/`).
- Role-based access (`patient`, `doctor`, `lab`, `admin`) plus onboarding UI with patient profile capture.
- Core resources: patients, reports, analytes, result values and alerts with default pagination (20 items).
- Patient ownership enforcement (patients see only their data, clinical roles see all).
- PDF upload endpoint that stores the original file, raw JSON metadata, and parsed fields (lab, report date, analytes) and automatically links the report to the authenticated user.
- AI-assisted summaries: after parsing a PDF, the backend optionally calls the OpenAI API to highlight the most meaningful analytes, explain results in plain language, suggest next tests, and recommend actions (falls back to rule-based summaries if no API key is configured).
- React dashboard with login/registration, protected routes, PDF upload UX, parsed report previews, profile management, and report detail/analyte views including reference ranges and AI insights.
- Onboarding wizard en español que captura contexto clínico y de estilo de vida para personalizar los reportes.
- Developer tooling: `pre-commit`, Black, Ruff, pytest, Tailwind.

## API Summary
| Endpoint | Method(s) | Description |
| --- | --- | --- |
| `/api/auth/register/` | POST | Register new user (patient by default) |
| `/api/auth/login/` | POST | Obtain JWT pair |
| `/api/auth/token/refresh/` | POST | Refresh JWT |
| `/api/patients/` | GET/POST | List or create patients |
| `/api/patients/{id}/` | GET | Retrieve patient |
| `/api/reports/` | GET/POST | List or create reports (`?patient_id=` filter) |
| `/api/reports/{id}/` | GET | Report detail |
| `/api/reports/upload/` | POST | Upload a PDF assigned to the authenticated user (stores parsed results + insights) |
| `/api/profile/` | GET/PUT/PATCH | Retrieve or update the authenticated patient's profile |
| `/api/onboarding/` | GET/PUT | Onboarding wizard data (completes onboarding flag when saved) |
| `/api/analytes/` | GET/POST | Manage analytes (POST restricted to clinical roles) |
| `/api/result-values/` | GET/POST | Manage lab values |
| `/api/alerts/` | GET | List alerts |

## Testing strategy
- `core/tests/test_api.py` covers auth happy path, patient creation, and patient-scoped report CRUD.
- PDF upload flow has backend coverage ensuring files are assigned to the authenticated patient and parsed metadata is returned.
- Add more coverage per sprint (alerts rules, analyte seeding idempotence, frontend component tests, etc.).

## Upload workflow
1. Register/sign in through the React UI (registration captures patient profile data and issues a JWT).
2. Visit `/upload`, pick a PDF, and submit. The backend saves the file under `media/reports/`, attaches it to your patient profile, and stores both the raw JSON metadata and the parser stub output (lab name, report date, analytes).
3. Each analyte becomes a `ResultValue` entry with its own measured date and reference range, enabling a longitudinal history per patient. AI insights run automatically after each upload (if `OPENAI_API_KEY` is set) and the explanation/recommendations are stored on the `Report` record for later viewing.
4. Open the profile dashboard or any report detail view to inspect parsed analytes, reference intervals, AI highlights, and download the stored PDF. Use the `mine=true` query parameter on `/api/patients/` or `/api/reports/` to fetch only the authenticated user's data when integrating new clients.

## Project layout
```
backend/  # Django app (config + core)
frontend/ # React + Vite + Tailwind UI
utils/    # Shared backend helpers
```
