# Setup guide - Credit Scoring Demo

This guide assumes you have never set up this project. Copy and paste the commands in order.
All backend commands run from `backend/`. Start the frontend in a second terminal from the repository root. On Windows, if activation is blocked, replace `python`, `pip` and `uvicorn` below with `.venv\Scripts\python.exe`, `.venv\Scripts\python.exe -m pip` and `.venv\Scripts\python.exe -m uvicorn`; no execution-policy change is needed.

## 1. Prerequisites

| Software | Minimum version | Check with |
| --- | --- | --- |
| Python | 3.11 or 3.12 | `python3 --version` (Windows: `python --version`) |
| Git | any recent version | `git --version` |
| pip | comes with Python | `pip --version` |
| Node.js (with npm) | 20.19 or newer | `node --version` |

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

For a **new clone only**, copy the example:

**macOS / Linux:** `cp .env.example .env`

**Windows:** `Copy-Item .env.example .env`

For an existing checkout, keep its `.env`. Then run from `backend/`:

```bash
python -m app.init_secrets
```

This generates local `DATA_ENCRYPTION_KEY` and replaces the development JWT secret with a random value. Running it again preserves a valid encryption key and all other configuration. No secret is printed. `DATABASE_URL` defaults to the local SQLite file. Restart the backend and sign in again after changing secrets.

`.env` is ignored by Git. Keep its encryption key together with your database backup: replacing or losing that key prevents opening previously encrypted identifiers. Do not copy `.env.example` over an existing `.env` or regenerate the key to repair an existing encrypted database.

## 5. Create and seed the database

```bash
python -m app.migrate
python -m app.seed
```

Expected output:

```
Seeded: users=3, loan_applications=12
```

This creates the file `credit_scoring.db` (all 4 tables from `docs/design.md`) and fills it with 3 users and 12 loan applications. Migration also works on an existing M2/M3 database: it adds account-status/token-version and encrypted-bank-account columns without deleting rows. Startup and seed also run this additive migration. Seed never overwrites existing accounts or applications.

**Test accounts** (demo data only, password for all three: `Demo@2026`):

| Email | Role | Sees |
| --- | --- | --- |
| `hoang@branch.vn` | Officer (User) | only his own 7 applications |
| `linh@branch.vn` | Officer (User) | only her own 5 applications |
| `thanh@branch.vn` | Manager (Admin) | all 12 applications |
Running it again prints `Data already present, skipping seed.` and changes nothing.

## 6. Run the server

```bash
uvicorn app.main:app --reload
```

Leave it running.

## 6b. Run the app (second terminal)

```bash
cd frontend        # from the project root, not backend/
npm ci
npm run dev
```

Open **http://localhost:5173**, sign in with a test account above. The dashboard appears. Try **New application** with income `20000000`, loan `100000000`, term `24`, payment `5000000`: you get a score with its reasons.

## 7. Verify the M3 interface

Open http://localhost:5173. Sign in as `hoang@branch.vn`, use **New application**, enter income `20000000`, loan `100000000`, term `24`, payment `5000000`, then **Submit and score**. Details must show the saved data, integer score and reasons. Use **Applications** and **Open** to find the saved record without typing a URL.

Submit income `0` to see a BR2 message and no new record. Submit valid data with payment `15000000` to see the high-risk banner. Score a record three times total, then once more to see BR5. Sign out and sign in as `linh@branch.vn`: Hoang's record must not appear. Manager `thanh@branch.vn` sees all records.

Seeded records are from previous days, so today's dashboard starts at zero. Create one to populate today's metrics. `/health` returns `{"status":"ok"}`. The legacy HTML `/loan-applications` on port 8000 is now protected; a bare browser request returns 401. Use the frontend, not the legacy URL, for M3.

## 8. Run the automated tests

```bash
pytest
```

Expected: all tests pass (the count changes as regressions are added). Tests use isolated in-memory databases and temporary SQLite files (migration/concurrency checks); they never touch `credit_scoring.db`. Test encryption keys are generated independently of `.env`.

## 9. Troubleshooting

| Problem | Cause | Fix |
| --- | --- | --- |
| `ModuleNotFoundError: No module named 'fastapi'` (or `pytest` / `dotenv`) | The virtual environment is not active, or step 3 was skipped | Activate it again (`source .venv/bin/activate` or `.venv\Scripts\Activate.ps1`), then run `pip install -r requirements.txt` |
| `ModuleNotFoundError: No module named 'app'` | The command was run outside the `backend/` folder | `cd` into `backend/` and run it again |
| The page says "Loan applications (0)" / "No loan applications yet." | Step 5 (seeding) was skipped, or it ran in another folder so another `credit_scoring.db` was created | Run `python -m app.seed` from `backend/`, then reload the page |
| PowerShell: "running scripts is disabled on this system" | Execution policy blocks the activate script | Use `.venv\Scripts\python.exe` directly instead of activating, or use `cmd` and `.venv\Scripts\activate.bat` |
| `Address already in use` when starting `uvicorn` | Port 8000 is taken by another process | Run `uvicorn app.main:app --reload --port 8001`, change the frontend API proxy to port 8001, and use http://localhost:5173 |
| The login says the password is wrong for every demo account | The database was created in Sprint 2, before demo accounts had a password; seed does not overwrite existing accounts | Stop the server, keep the old database and its encryption key, set DATABASE_URL to a separate new demo file (`sqlite:///./credit_scoring_demo.db`), run `python -m app.seed`, restart |
| `Python was not found` | Windows Store alias is being used instead of an installed interpreter | Try `py -3.12 -m venv .venv`; if `py` is absent, install Python 3.12 with PATH enabled. Once created, use `.venv\Scripts\python.exe` directly |
| Identifier protection is not configured (503) | Encryption key missing or invalid | Run `python -m app.init_secrets` from backend and restart; for an existing encrypted DB restore its original valid key |
| Saved identifier cannot be opened (503) | Wrong key or damaged ciphertext | Restore the original `.env` key and matching database backup; do not generate a replacement key |
| `no such column: users.is_active` | Existing schema not upgraded | Stop the old server, run `python -m app.migrate`, restart |
| Employee account is inactive (403) | Manager deactivated the account | Manager: Employees -> Reactivate; employee must sign in again |
| `npm: command not found`, or `npm ci` fails | Node.js is missing or too old | Install Node.js 20.19+ from nodejs.org, then run `npm ci` again |
| The page loads but every action says "We can't reach the server" | The backend is not running, or it runs on another port | Start `uvicorn` (step 6); if you used a port other than 8000, change the `/api` proxy URL in `frontend/vite.config.js` |
| You want a clean demo database | The seed only runs on an empty database | Stop the server, set DATABASE_URL to a separate new demo SQLite file, seed and restart. Keep the original database and its `.env` encryption key |

## 10. Tested by

> **Sprint 3 - to be filled in by a teammate who did not write the code:** name, machine, date, minutes.

Sprint 2:

> Tested by: **Nguyễn Hoàng Tuấn**, on a Windows machine, on 4/10/2026, took about 5 minutes.


## 11. Manager approval demo

As Hoang, create and score a valid application (income 20000000, loan 100000000, term 24, payment 5000000, history "3 years, on time", CIC 1). It is Scored / Eligible for proposal and waits for Manager review. Log out; log in as `thanh@branch.vn` with the demo password. Applications -> Open the record -> review data/reasons -> Approve application -> Confirm approval. Status becomes Approved with Manager name/time; reload preserves it. Officer cannot approve. Scores below 70, CIC groups 3-5, unscored/cancelled/rejected records cannot be approved. Approval records an assessment decision; disbursement is outside this app.

## 12. BR7 and employee-management demo

Use synthetic values only for this demo: Citizen ID `001234567890`, bank account `01234567890123`. Enter them in **New application** with otherwise valid loan data. Submit -> Details: only `********7890` and `********0123` appear. **View full numbers (logged)** opens them for 30 seconds; Hide numbers, changing tabs or leaving the window masks them again. Every successful lookup writes actor, application, time and last four digits only to `event_logs`. Linh cannot open Hoang's record or its protected numbers; Thanh can. Ordinary list/detail/scoring/HTML responses never include full identifiers or ciphertext. Neither identifier is sent to the scoring model.

As Thanh, use top bar **Employees** -> create an Officer with name, email and a 12–128 character initial password. Rename, deactivate (confirm) or reactivate the Officer. Deactivation preserves loan records and invalidates existing sessions; reactivation requires a fresh login. This screen cannot create or alter Manager accounts. No real account has been changed by the implementation tests.

For an existing checkout on Windows, run these from `backend/` before restarting:

```powershell
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m app.init_secrets
.venv\Scripts\python.exe -m app.migrate
.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

## 13. Compare Officer and Manager workspaces

Run Vite from the updated `AI66A_group4_topicA5_SE/frontend` checkout. Stop older Vite terminals first, then `npm ci` and `npm run dev`; open the exact Local URL printed by Vite. Sign out before switching accounts (or use separate browser profiles); the app keeps one signed-in account per tab.

- Hoang/Officer: **My dashboard**, **My applications**, primary **New application**, own daily statistics and records. No Employees or branch-review filters; cannot approve.
- Thanh/Manager: **Branch overview**, **Branch applications**, **Employees**. Dashboard shows branch daily statistics and **Manager review queue** across all dates. Use review/high-risk/eligible cards, filter by employee, open Review and make an eligible approval decision. Approved records leave the review queue when it is reopened.

An empty daily summary does not mean the Manager has no backlog. Seeded applications from earlier days appear in the review queue if still open. Creating applications is still available to both authenticated roles, consistent with the API. UI role cues do not grant permissions; the server enforces BR8.

Frontend checks (from frontend/): `npm test`, `npm run build`. Tests render React routes and exercise queue filters without accessing the user's database; they do not replace the browser acceptance checklist.
