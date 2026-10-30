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
| US04 Score with explanation | `/loan-applications/:id` | Opens after Submit; also from the list (**My applications** > **Open**, or Manager **Branch applications** > **Review**) |

UI documentation (stories, wireframes, error messages): [`docs/ui.md`](docs/ui.md)

## Project Board

🔗 Project Board: **the actual team board URL has not been recorded in this repository; add it before submission**. Repository: https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE

Sprint records: [Sprint log](docs/sprint-log.md), including the [Sprint 3 scope and review record](docs/sprint-log/sprint-log3.md). The log distinguishes proposed estimates from confirmed commitment and accepted results.

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

From `frontend/`:

```bash
npm test
npm run build
```

Local checks on 2026-10-18 passed 170 backend tests, 6 frontend tests and the
production build. These are local results; clean-machine/browser acceptance and
the corresponding PR CI/review evidence are recorded separately.

## Docs

- Implementation history: [docs/changelog.md](docs/changelog.md).

- Design and requirements are in the `docs/` folder. See `docs/design.md` and `docs/requirements.md` for more details.

M3 verification: follow the demos in [docs/SETUP.md](docs/SETUP.md) and compare the UI with [docs/ui.md](docs/ui.md); five running-app screenshots are linked there, while the tester/date/results checklist and final submission evidence still need to be completed. The temporary issue-planning Markdown is not required to run or understand this project.

Manager flow: after an officer scores an eligible application, sign in as `thanh@branch.vn`, use **Branch applications -> Review -> Approve application -> Confirm approval**. The details record approver/time. Scoring alone does not approve; disbursement is outside this demo.

BR7/BR8: New application accepts optional Citizen ID and bank account numbers, encrypted before storage. Details shows masked values; **View full numbers (logged)** performs an authorized, audited lookup. Manager navigation includes **Employees** to create Officers, rename, deactivate and reactivate accounts. See [business-rule coverage](docs/traceability.md#business-rules). Keep the locally generated `.env` encryption key with the database backup.

US10 is implemented in this copy: an owner or Manager can edit a pending
application with no scoring result at `/loan-applications/:id/edit`, or cancel it
from Details after confirmation. Edits revalidate the merged application and BR9,
preserve omitted identifiers and recalculate BR3. Cancellation keeps the audit
record, is idempotent and removes the application from active review. Processed
applications and applications owned by another Officer remain protected. See
[the US10 setup demo](docs/SETUP.md#s4-22-editcancel-demo) and
[US10 traceability](docs/traceability.md).

## Current P0 checks in this copy

US01, US03, US04, US08 and US09 are implemented and passed local browser checks
on 2026-10-29. The saved application and High risk flag appear before scoring
finishes. Failed scoring can be retried on the same record. Login field validation
matches the API. The current scorer is `rules-v1`; history is shown on Details.

Checks: **523 backend tests (96.02% coverage), 52 frontend unit/render tests,
7 browser tests and production build passed**. Browser timings on this machine:
login 953 ms; save-to-details 93 ms with scoring deliberately held. See
[ui.md section 4](docs/ui.md#4-what-changed-since-m2) for actual viewport captures
and [testing.md](docs/testing.md) for reproducible commands. From `frontend/`,
`npm run test:e2e` starts isolated test servers and a temporary demo DB.
These local results do not certify another machine's timing or a GitHub/LMS delivery.


### US02 logout (S4-24)

Use **Log out** in the top bar. The browser immediately returns to Login and
the API revokes only that session; another independent login remains valid.
See [logout setup and checks](docs/SETUP.md#s4-24-logout-verification).

## P1/P2 completed in this copy (2026-10-30)

US07 adds Manager-only Notifications, a 30-second counter and persisted read state.

US05 details/not-found
is verified; US06 has an actual Scoring history tab.
