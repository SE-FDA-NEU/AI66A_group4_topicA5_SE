# Project changelog — API and AI input/output

This file records implemented changes for team synchronization under process.md section 4, rule 4. Entries describe local implementation; they do not establish GitHub review, CI, merge, or browser acceptance. Current design and reasons for M2-to-M3 changes remain in [design.md](design.md), especially section 7.

Changes recorded under process.md section 4, rule 4.

- **Added** `GET /api/auth/me`.
- **Added** `POST /api/loan-applications`, `GET /api/loan-applications`, `GET /api/loan-applications/{id}`, `POST /api/loan-applications/{id}/score`, `GET /api/loan-applications/{id}/scores`, `GET /api/dashboard/summary` (all as designed in `design.md` section 3).
- **Changed** `422` body of `POST /api/loan-applications`: `{"detail": "<message>", "errors": {"<field>": "<message>"}}`.
- **Changed** `GET /api/dashboard/summary` also returns `date` and `high_risk_count`.
- **Scoring module** (`app/scoring.py`): `predict(features) -> (score, [reason strings])`, `MODEL_VERSION = "rules-v0"`. Features: `dsr`, `loan_to_annual_income`, `term_months`, `cic_debt_group`, `has_history`. Sprint 4 keeps this signature.
- **Seed** accounts now have a password (see `SETUP.md`). Existing rows/passwords are preserved; a separate fresh demo database can be seeded for legacy Sprint 2 accounts.

- **BR8:** protected the legacy HTML route, with owner filtering.
- **BR5:** hourly limit also covers CIC-rejected results; **BR1:** noninteger model scores are hidden.
- **UI:** maps stored `pending` to "Scoring in progress", uses "Recommendation Rejected" for US04, times out stalled requests, and avoids claiming no data was saved on unknown server failures.
- **Frontend dependencies:** React Router 7.18.4, Vite 6.4.3, React plugin 4.7.0; Node.js 20.19+ documented. npm audit found zero vulnerabilities at preparation time.
- **Documentation:** four wireframe SVGs, canonical sprint-log/retro entry points, and M3 verification guidance in SETUP.md/ui.md. External evidence remains pending.

- **Manager decision:** implemented PATCH `/api/loan-applications/{id}/approve`, Admin authorization, valid latest eligible score, final-state guards and a conditional status/result update. Persists `loan.approved` actor/time/high-risk context atomically and exposes approval metadata on details.
- **UI:** Manager approval confirmation, role/eligibility guidance, approver/time, preserved high-risk flag; approved applications cannot be scored again.
- **Tests:** approval success, owner/anonymous denial, invalid state/results, latest-result behavior, CIC, duplicate audit, high risk and BR5 review resolution. US10 edit/cancel remains pending.

- **BR7:** added optional citizen_id (9/12 digits) and bank_account (6–20 digits); encrypted using Fernet before persistence; normal APIs return only masked values. POST sensitive-data/reveal authorizes owner/Admin, commits masked access events before returning plaintext and disables caching. No identifiers in model features/snapshots; invalid model output is not logged verbatim.
- **BR8:** added Manager-only GET/POST/PATCH `/api/admin/users`, Officer creation with hashed password, rename and active status, audit events, and token-version revocation on status changes. Employees UI has confirmation and friendly errors.
- **Schema/setup:** additive migration for existing rows, local init_secrets command that preserves existing keys, cryptography 46.0.7 dependency. Existing `.env` and user database are not overwritten by this code delivery.
- **BR5:** scoring and approval acquire a transaction-held database write lock before reading status/results, preventing simultaneous requests from bypassing the hourly count.
- **Tests:** encrypted raw DB values, masked response/log/snapshot checks, audited reveal success/failure/authorization, account status and old-session denial, existing-schema migration, concurrent scoring, score boundaries and all CIC bad-debt groups. Browser acceptance/review/merge evidence remains pending.

- **Role-focused UI:** Officer dashboard/list emphasize own work and create/score actions; Manager dashboard adds branch-wide all-date review queue, high-risk/eligible counters, employee filters and management link. Navigation and details guidance differ by role. Uses existing authenticated APIs; no data-model or API-contract change.
- **Frontend checks:** `npm test` runs queue/filter contracts and rendered React route checks for both roles. esbuild 0.25.12 is now explicitly a test/build dev dependency (already used by Vite); CI runs frontend tests before build.

- **S3-37 documentation:** added the scoring-to-Manager-confirmation flow, exact API error messages, approval response contract and code/test traceability. `ui.md` now has all four M3 sections and explains database-backed data plus the approval design change. The approval suite passed 17 checks locally on 2026-10-18; browser screenshots/acceptance remain pending. US10 edit/cancel and disbursement are not delivered by approval.
