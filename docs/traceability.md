# Traceability

Every screen traces back to a feature and forward to the issue that built it.
This table is the single source of truth for Milestone 1 Section 6 and for the Milestone 4 report. Keep it current — a PR that adds a route and does not update this file should not be approved.

| Route | Purpose | Access | Priority | Feature | Story issue | PR | Status |
|-------|---------|--------|----------|---------|-------------|-----|--------|
| `/` | Landing page | G | P0 | F1 - Login/Logout | US01 (#9), US02 (#19) | | In progress (login works, log out is a button) |
| `/dashboard` | Overview of the number of applications and the average score for the day | U | P0 | F2 - Overview Dashboard | US08 (#13) | | In progress |
| `/loan-applications/new` | Create a new loan application | U | P0 | F3 - Loan Application Entry & Validation | US03 (#10), US09 (#14) | | In progress |
| `/loan-applications/:id` | View application details: information, score, explanation, and history | U | P0 | F4 - Scoring & Result Explanation | US04 (#11), US05 (#20) | | In progress |
| `/loan-applications` | List of all processed loan applications | U | P1 | F5 - Application History & Management | US06 (#12), US10 (#22) | | In progress (list only) |

| `/admin/users` | Create/rename/deactivate/reactivate Officer accounts | A | P2 | BR8 account management | BR8; follow-up tasks S3-40/S3-41, actual issue pending | | In progress (API/UI tested locally; browser/review/merge pending) |

**Access codes:** G = guest (not logged in) · U = authenticated user · A = admin

**Status:** Not started / In progress / Done

## Business rules

Numbered so that issues and tests can reference them.

| # | Rule | Enforced where | Tested by |
|---|------|----------------|-----------|
| BR1 | Integer 0–100 only; invalid score hidden, manual_review | `scoring_service.py:score_application` | `test_scoring.py` invalid values and 0/100; `test_scoring_unit.py` |
| BR2 | Income > 0; invalid input not saved/scored | `routers/applications.py:validate_application`; DB CHECK | `test_applications.py`, `test_models.py` |
| BR3 | DSR >50% -> persistent High risk; Manager explicitly reviews | create API, approval API/UI | `test_applications.py` exactly/above 50%; `test_scoring.py`, `test_approval.py` |
| BR4 | CIC 3/4/5 reject without model call, cannot approve | `scoring_service.py`, approve API | `test_scoring.py` all bad-debt groups; `test_approval.py` |
| BR5 | Three results per rolling hour, fourth blocked + manual_review | lock before count/insert in `transactions.py`/scoring service | `test_scoring.py` limit/old/CIC; `test_br_integrity.py` independent simultaneous sessions |
| BR6 | <40 rejected; 40–69 review; >=70 eligible | `scoring_service.py:label_for`; approval API | `test_scoring.py` persisted 0/39/40/69/70/100; `test_scoring_unit.py`, `test_approval.py` |
| BR7 | Encrypt Citizen ID/account fields; masked normal responses; authorized decrypt + access audit | `privacy.py`, create/reveal API, `SensitiveData.jsx`; local key initialization | `test_privacy.py`: raw DB ciphertext, no leaks, authorization, wrong/missing key, failed audit, repeat accesses; `test_br_integrity.py`: key preservation/migration |
| BR8 | Officer own loans; Manager all + employee management; inactive users denied | current-user dependency; applications/legacy HTML; `routers/users.py`, Employees UI | `test_applications.py`, `test_walking_skeleton.py`, `test_privacy.py`, `test_users.py`: account CRUD/status/session revocation/role guards |

All eight BRs are implemented with local automated coverage. Browser acceptance and release evidence remain pending; requirements.md is unchanged.

M3 implementation is present locally. Status remains In progress until browser acceptance, teammate approval, CI and merge are evidenced; do not mark Done from code presence alone. The list supports navigation to US05; US06 history UI and US10 edit/cancel remain unimplemented. Manager approval is implemented on the details screen; browser review/CI/merge evidence remains pending.

Manager approval: `/loan-applications/:id` -> `PATCH /api/loan-applications/{id}/approve` -> US10 (#22) / BR3 / BR6 / Admin authorization -> `tests/test_approval.py`. Local implementation; do not mark US10 Done until its edit/cancel criteria are met.

Role-focused UI follow-up: US08 (#13) -> Officer daily overview vs Manager branch summary/review queue; US05 (#20)/BR8 -> Manager filters vs Officer own list; approval -> role-specific guidance on details. API scope is unchanged. `frontend/tests/review.test.js` covers queue and filters; `roles.render.test.js` renders the actual routes to verify role entry points and Manager-only Employees guidance. Browser/review/CI/merge evidence remains pending.
