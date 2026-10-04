# Setup guide - Credit Scoring Demo

This guide assumes you have never set up this project. Copy and paste the commands in order.
All commands run from the `backend/` folder unless stated otherwise.

## 1. Prerequisites

| Software | Minimum version | Check with |
| --- | --- | --- |
| Python | 3.11 or 3.12 | `python3 --version` (Windows: `python --version`) |
| Git | any recent version | `git --version` |
| pip | comes with Python | `pip --version` |

No other library is assumed to be installed.

## 2. Clone and create a virtual environment

**macOS / Linux:**
```bash
git clone https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE.git
cd AI66A_group4_topicA5_SE/backend
python3 -m venv .venv
source .venv/bin/activate
```

**Windows (PowerShell):**
```powershell
git clone https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE.git
cd AI66A_group4_topicA5_SE\backend
python -m venv .venv
.venv\Scripts\Activate.ps1
```

## 3. Install the dependencies

```bash
pip install -r requirements.txt
```

## 4. Configuration

**macOS / Linux:** `cp .env.example .env`
**Windows:** `copy .env.example .env`

Nothing needs to be edited. `DATABASE_URL` points to a SQLite file that is created automatically when you seed.

## 5. Create and seed the database

```bash
python -m app.seed
```

Expected output:

```
Seeded: users=3, loan_applications=12
```

This creates the file `credit_scoring.db` (all 4 tables from `docs/design.md`) and fills it with 3 users and 12 loan applications.
Running it again prints `Data already present, skipping seed.` and changes nothing.

## 6. Run the server

```bash
uvicorn app.main:app --reload
```

## 7. How to tell it works (walking skeleton)

Open **http://localhost:8000/loan-applications** in a browser.

Expected: a page titled **"Loan applications (12)"** with a table of exactly 12 rows (owner, income, loan amount, term,
estimated payment, purpose, status, high-risk flag). Three rows show **Yes** in the last column (DSR above 50%, rule BR3).

The data is read from the `loan_applications` table in `credit_scoring.db`, not from a list in the code.
Also available: http://localhost:8000/health returns `{"status":"ok"}`, and http://localhost:8000/docs shows the Swagger UI.

## 8. Run the automated tests

```bash
pytest
```

Expected: `21 passed`. The tests use an in-memory database, so they never touch `credit_scoring.db` and can run in any order.

## 9. Troubleshooting

| Problem | Cause | Fix |
| --- | --- | --- |
| `ModuleNotFoundError: No module named 'fastapi'` (or `pytest` / `dotenv`) | The virtual environment is not active, or step 3 was skipped | Activate it again (`source .venv/bin/activate` or `.venv\Scripts\Activate.ps1`), then run `pip install -r requirements.txt` |
| `ModuleNotFoundError: No module named 'app'` | The command was run outside the `backend/` folder | `cd` into `backend/` and run it again |
| The page says "Loan applications (0)" / "No loan applications yet." | Step 5 (seeding) was skipped, or it ran in another folder so another `credit_scoring.db` was created | Run `python -m app.seed` from `backend/`, then reload the page |
| PowerShell: "running scripts is disabled on this system" | Execution policy blocks the activate script | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, or use `cmd` and `.venv\Scripts\activate.bat` |
| `Address already in use` when starting `uvicorn` | Port 8000 is taken by another process | Run `uvicorn app.main:app --reload --port 8001` and open `http://localhost:8001/loan-applications` |
| You want a clean database | The seed only runs on an empty database | Stop the server, delete `credit_scoring.db`, run `python -m app.seed` again |

## 10. Tested by

> Tested by: **@NguyenHoangTuan**, on a Windows machine, on 4/10/2026, took about 10 minutes.
