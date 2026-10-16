# Credit Scoring Demo

## Team

* **Product Owner (PO):** Đỗ Quang Trung
* **Scrum Master (Sprint 1):** Trịnh Đức Thành
* **Scrum Master (Sprint 2):** Vu Ngoc Hai
* **Scrum Master (Sprint 3):** Nguyễn Quang Huy
* Members: Đỗ Quang Trung, Trịnh Đức Thành, Vũ Ngọc Hải, Nguyễn Quang Huy

## P0 stories - where each one starts

Run the app first ([`docs/SETUP.md`](docs/SETUP.md), about 5 minutes), then open **http://localhost:5173**.
**Test accounts** (password for all: `Demo@2026`): `hoang@branch.vn` (officer), `linh@branch.vn` (officer), `thanh@branch.vn` (manager, sees every application).

| P0 story | Starts at | What to do |
| --- | --- | --- |
| US01 Log in | `/` | Sign in with a test account. Three wrong passwords lock the account for 15 minutes |
| US08 Dashboard | `/dashboard` | Shown right after login: today's applications and average score |
| US03 Input a loan application | `/loan-applications/new` | Top bar > **New application**, fill the form, **Submit and score** |
| US09 Data validation | `/loan-applications/new` | Submit with an empty or text income and read the messages |
| US04 Score with explanation | `/loan-applications/:id` | Opens after Submit; also from the list (**Applications** > **Open**) |

UI documentation (stories, wireframes, error messages): [`docs/ui.md`](docs/ui.md)

## Project Board

🔗 Project Board: **pending actual GitHub Projects URL from the team**. Repository: https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE

## Definition of Done

🔗 See the full details at [`docs/definition-of-done.md`](docs/definition-of-done.md) — all 8 required criteria must be satisfied; none may be skipped.

## Traceability

🔗 Screen → feature → issue → PR: see [`docs/traceability.md`](docs/traceability.md)

## Setup

Follow [docs/SETUP.md](docs/SETUP.md) to clone, install, create and seed the database, then start both servers. Requires Python 3.11/3.12 and Node.js 20.19+.

Backend (from `backend/`, virtual environment active):

```bash
pip install -r requirements.txt
python -m app.init_secrets
python -m app.migrate
python -m app.seed
uvicorn app.main:app --reload
```

Frontend (second terminal, from `frontend/`):

```bash
npm ci
npm run dev
```

Open http://localhost:5173. The API is on port 8000; `/health` is public, while application data requires authentication.

## Tests

- From the `backend` folder (virtualenv active):

```bash
pytest
```

## Docs

- Implementation history: [docs/changelog.md](docs/changelog.md).

- Design and requirements are in the `docs/` folder. See `docs/design.md` and `docs/requirements.md` for more details.

M3 verification: follow the demos in [docs/SETUP.md](docs/SETUP.md) and compare the UI with [docs/ui.md](docs/ui.md); browser and submission evidence is still required. The temporary issue-planning Markdown is not required to run or understand this project.

Manager flow: after an officer scores an eligible application, sign in as `thanh@branch.vn`, use **Applications -> Open -> Approve application -> Confirm approval**. The details record approver/time. Scoring alone does not approve; disbursement is outside this demo.

BR7/BR8: New application accepts optional Citizen ID and bank account numbers, encrypted before storage. Details shows masked values; **View full numbers (logged)** performs an authorized, audited lookup. Manager navigation includes **Employees** to create Officers, rename, deactivate and reactivate accounts. See [business-rule coverage](docs/traceability.md#business-rules). Keep the locally generated `.env` encryption key with the database backup.
