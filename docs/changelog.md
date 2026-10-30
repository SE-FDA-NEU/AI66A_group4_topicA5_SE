# Project changelog — API and AI input/output

- **P0 completion in the local copy (2026-10-29):** Login now mirrors the API's
  required/254/128 limits and displays field errors. New application opens persisted
  Details before scoring; pending/High risk are visible while a score is delayed.
  Details consumes the automatic-score flag once, guards stale responses and
  retains the saved record plus retry on scoring failure. No new create occurs on retry.
  Added four login-validator unit tests and seven Playwright browser tests with
  isolated seeded SQLite. All passed; 523 existing backend tests passed with 96.02%
  coverage, 52 frontend unit/render tests and the Vite production build passed.
  Updated ui/design/requirements/traceability/testing/setup to match rules-v1 and
  the implemented Score history section. Added viewport captures using synthetic data.
  No existing DB/key, scoring formula, GitHub branch or remote was changed.

- **S4-06 — login validation and exact lock expiry:** email is limited to 254
  characters and password to 128; blank login values receive clear 422 field errors.
  Validation failures leave the failure counter and lock unchanged. Password text
  is preserved. Added input/body/counter regressions and fixed-clock tests that
  create the three-failure lock, verify exactly 15 minutes and check expiry at
  -1, 0 and +1 microsecond. The existing runtime expiry comparison remains unchanged.

- **S4-05 — application validation and BR9:** missing, blank or null income now returns
  exactly `Income is required`; monetary/term/CIC inputs reject booleans and malformed
  whole-number text. Optional CIC/text blanks become NULL and text is trimmed before
  length validation. Unknown fields and malformed/non-object bodies receive clear
  field/form errors. BR9 rejects payment above loan amount or payment x term below loan
  amount with a 422 on `estimated_monthly_payment`; invalid inputs save nothing.
  Added validation regressions and adjusted the low-score test fixture to repay its
  600,000,000 loan over 24 months, without changing the scoring model.


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
- **Documentation:** four UI wireframe SVGs and M3 verification guidance in SETUP.md/ui.md. The canonical [sprint log](sprint-log.md) links to the detailed [Sprint 3 record](sprint-log/sprint-log3.md); the retrospective section is included in that log, with results still to be recorded. Five running-app screenshots are linked from ui.md. Independent browser/clean-clone outcomes and final submission evidence still require recorded results.

- **Manager decision:** implemented PATCH `/api/loan-applications/{id}/approve`, Admin authorization, valid latest eligible score, final-state guards and a conditional status/result update. Persists `loan.approved` actor/time/high-risk context atomically and exposes approval metadata on details.
- **UI:** Manager approval confirmation, role/eligibility guidance, approver/time, preserved high-risk flag; approved applications cannot be scored again.
- **Tests:** approval success, owner/anonymous denial, invalid state/results, latest-result behavior, CIC, duplicate audit, high risk and BR5 review resolution. US10 edit/cancel remains pending.

- **BR7:** added optional citizen_id (9/12 digits) and bank_account (6–20 digits); encrypted using Fernet before persistence; normal APIs return only masked values. POST sensitive-data/reveal authorizes owner/Admin, commits masked access events before returning plaintext and disables caching. No identifiers in model features/snapshots; invalid model output is not logged verbatim.
- **BR8:** added Manager-only GET/POST/PATCH `/api/admin/users`, Officer creation with hashed password, rename and active status, audit events, and token-version revocation on status changes. Employees UI has confirmation and friendly errors.
- **Schema/setup:** additive migration for existing rows, local init_secrets command that preserves existing keys, cryptography 46.0.7 dependency. Existing `.env` and user database are not overwritten by this code delivery.
- **BR5:** scoring and approval acquire a transaction-held database write lock before reading status/results, preventing simultaneous requests from bypassing the hourly count.
- **Tests:** encrypted raw DB values, masked response/log/snapshot checks, audited reveal success/failure/authorization, account status and old-session denial, existing-schema migration, concurrent scoring, score boundaries and all CIC bad-debt groups. Local merge references are recorded in traceability.md; local automated coverage alone does not establish browser acceptance or the linked PR CI/review outcomes.

- **Role-focused UI:** Officer dashboard/list emphasize own work and create/score actions; Manager dashboard adds branch-wide all-date review queue, high-risk/eligible counters, employee filters and management link. Navigation and details guidance differ by role. Uses existing authenticated APIs; no data-model or API-contract change.
- **Frontend checks:** `npm test` runs queue/filter contracts and rendered React route checks for both roles. esbuild 0.25.12 is now explicitly a test/build dev dependency (already used by Vite); CI runs frontend tests before build.

- **S3-37 documentation:** added the scoring-to-Manager-confirmation flow, exact API error messages, approval response contract and code/test traceability. `ui.md` now has all four M3 sections and explains database-backed data plus the approval design change. The approval suite passed 17 checks locally on 2026-10-18; running-app screenshots are now linked in ui.md, while its independent acceptance checklist remains unfilled. US10 edit/cancel and disbursement are not delivered by approval.

- **Documentation alignment (2026-10-18):** corrected model/legacy-route/API/schema descriptions, exact UI error strings, wireframe links, traceability and seed-versus-migration instructions. Added current architecture/ERD SVGs and a canonical sprint-log entry point; synchronized the refined Sprint 3 issue scope and owners without inventing review results or velocity. Dataset ignore paths now match the documented data policy. The requirements baseline is retained; the US09 empty-income wording gap remains explicitly open. Prior local verification: 170 backend tests, 6 frontend tests and a successful production build.

- **GitHub sprint-log reconciliation (2026-10-18):** linked the actual 53 task/chore issues (38 Tasks, 15 Chores, all Closed), corrected assignee counts to Trung 13 / Thành 12 / Hải 13 / Huy 15, separated uncreated S3-16 from additional chore #194, and used actual issue titles/body estimates. Recorded Dashboard #13 as GitHub P1, Open parent stories and the approval/edit-cancel scope gap. The 116-point local plan and 115-point mapped subset remain unverified board estimates; committed/completed/velocity and missing acceptance records are not inferred from Closed issues.
