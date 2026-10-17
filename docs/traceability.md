# Traceability

Every screen traces back to a feature and forward to the issue that built it.
This table is the single source of truth for Milestone 1 Section 6 and for the Milestone 4 report. Keep it current — a PR that adds a route and does not update this file should not be approved.

| Route | Purpose | Access | Priority | Feature | Story issue | PR | Status |
|-------|---------|--------|----------|---------|-------------|-----|--------|
| `/` | Landing page | G | P0 | F1 - Login/Logout | US01 (#9), US02 (#19) | | In progress (login/logout interface implemented; browser acceptance pending) |
| `/dashboard` | Overview of the number of applications and the average score for the day | U | P0 | F2 - Overview Dashboard | US08 (#13) | | In progress (implemented; browser acceptance pending) |
| `/loan-applications/new` | Create a new loan application | U | P0 | F3 - Loan Application Entry & Validation | US03 (#10), US09 (#14) | | In progress (implemented; browser acceptance pending) |
| `/loan-applications/:id` | View saved application data, latest score and explanation (history UI pending) | U | P0 | F4 - Scoring & Result Explanation | US04 (#11), US05 (#20) | | In progress (implemented; browser acceptance pending) |
| `/loan-applications` | List of all processed loan applications | U | P1 | F5 - Application History & Management | US06 (#12), US10 (#22) | | In progress (list/navigation implemented; history UI and edit/cancel pending) |
| `/loan-applications/:id` | Review eligible score, confirm Manager approval and view decision actor/time | A | P1 | F5 - Manager decision | US10 (#22), BR3/BR6; tasks S3-34-S3-37 | | In progress (API/UI present; browser evidence pending) |


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

## Manager approval (S3-37)

The Officer creates/scores an application and the Manager reaches the same record
through the application list or review queue. Eligible is a recommendation, not
approval. Confirmation calls `PATCH /api/loan-applications/{id}/approve`; approval
persists the decision and access-controlled actor/time metadata. It does not
implement disbursement. US10 remains In progress because edit/cancel is pending.

| Responsibility | Implementation | Automated coverage |
| --- | --- | --- |
| Admin authorization, latest eligible score, state/CIC guards | [approve_application](../backend/app/routers/applications.py) | [test_approval.py](../backend/tests/test_approval.py): Officer/anonymous denial, missing loan, invalid states/scores, CIC and latest result |
| Persist approved status and one audit; show actor/time after reload | [approve_application / application_detail](../backend/app/routers/applications.py) | `test_manager_approval_persists_actor_time_and_blocks_rescoring`, `test_repeat_approval_does_not_duplicate_audit` |
| High-risk review and BR5 manual-review resolution | Approval API and [ApplicationDetail.jsx](../frontend/src/pages/ApplicationDetail.jsx) | `test_manager_can_review_high_risk_eligible_result`, `test_br5_review_can_be_resolved_by_manager_with_eligible_score` |
| Role guidance, confirmation and decision/error display | [ApplicationDetail.jsx](../frontend/src/pages/ApplicationDetail.jsx), [review.js](../frontend/src/review.js) | API coverage above; browser acceptance pending |

Local check on 2026-10-18: from `backend/`,
`.venv/Scripts/python.exe -B -m pytest tests/test_approval.py -q -p no:cacheprovider`
returned **17 passed**. This validates the API checks, not the browser flow.
Follow [the approval demo](SETUP.md#11-manager-approval-demo) and record actual
screenshots/results under [ui.md section 4](ui.md#4-what-changed-since-m2).
Browser evidence, teammate review and S3-37 completion remain pending.



