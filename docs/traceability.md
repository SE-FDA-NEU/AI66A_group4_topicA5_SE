# Traceability

Every screen traces back to a feature, implementation and the PRs that built it.
Keep this mapping current when a route or story scope changes. PR references below
are supported by merge commits in the local `main` history as of 2026-10-18;
they do not establish a new CI run or browser acceptance result.

| Route | Purpose | Access | Priority | Feature | Story issue | PR | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | Sign in; logout is a top-bar action that returns here | G | P0 | F1 - Login/Logout | US01 (#9), US02 (#19, P2) | [#120](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/120), [#122](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/122), [#133](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/133), [#134](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/134) | In progress: implemented; independent browser/timing/logout-cache checks pending |
| `/dashboard` | Officer daily overview; Manager branch daily metrics and review queue across all dates | U | P0 | F2 - Overview Dashboard | US08 (#13) | [#150](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/150), [#181](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/181), [#190](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/190) | In progress: implementation/automated coverage present; browser result pending |
| `/loan-applications/new` | Save a loan application, validate fields and request scoring | U | P0 | F3 - Loan Application Entry & Validation | US03 (#10), US09 (#14) | [#127](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/127), [#128](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/128), [#173](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/173), [#183](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/183) | In progress: API required-income wording and BR9 implemented in S4-05; browser/timing checks pending |
| `/loan-applications/:id` | View saved input, latest score/explanation, protected identifiers, edit/cancel controls and Manager decision | U | P0 | F4 - Scoring & Result Explanation; US05 is P1 | US04 (#11), US05 (#20), US10 (#22); approval is an additional Manager workflow | [#170](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/170), [#174](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/174), [#180](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/180), [#186](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/186) | In progress: implementation/API tests present; US10 browser result pending |
| `/loan-applications/:id/edit` | Edit an owned/Admin-accessible pending application with no scoring result | U | P1 | F5 - Application Navigation & Management | US10 (#22) | — | In progress: implementation and API/browser tests present; independent browser result pending |
| `/loan-applications` | List accessible saved applications and open their details; Manager review/risk/eligibility/employee filters | U | P1 | F5 - Application Navigation & Management | US05 (#20); US06 (#12) history UI and US10 (#22) edit/cancel | [#169](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/169), [#190](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/190) | In progress: list/filter/navigation and US10 entry point present; independent browser result pending |
| `/admin/users` | Create/rename/deactivate/reactivate Officer accounts; display Manager accounts without editing them | A | P2 | BR8 account management | BR8; follow-up tasks S3-40/S3-41 | [#175](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/175), [#177](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/177), [#184](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/184) | In progress: implementation/automated coverage present; independent browser result pending |

**Access codes:** G = guest (not logged in); U = authenticated user; A = Admin
(branch Manager). Officer queries are restricted to that Officer's applications;
Manager queries can include all branch applications. Protected identifier lookup
uses the same application access guard.

**Status:** Not started / In progress / Done. The UI document uses the required M3
values `not started` / `partly works` / `works`; its P0 rows remain `partly works`
until outstanding independent browser/timing acceptance results are recorded.

## Business rules

Numbered so that issues and tests can reference them.

| # | Rule | Enforced where | Tested by |
| --- | --- | --- | --- |
| BR1 | Integer 0-100 only; invalid score hidden, manual_review | `backend/app/scoring_service.py:score_application`; score DB CHECK | `test_scoring.py` invalid values and 0/100; `test_scoring_unit.py`, `test_models.py` |
| BR2 | Income > 0; invalid input not saved/scored | `backend/app/routers/applications.py:ApplicationIn`; `backend/app/main.py:validation_error_handler`; `LoanApplication` DB CHECK in `models.py` | `test_applications.py`, `test_application_validation.py`, `test_models.py` |
| BR3 | DSR >50% -> persistent High risk; Manager explicitly reviews | create API, approval API/UI | `test_applications.py` exactly/above 50%; `test_scoring.py`, `test_approval.py` |
| BR4 | CIC 3/4/5 reject without model call, cannot approve | `scoring_service.py`, approve API | `test_scoring.py` all bad-debt groups; `test_approval.py` |
| BR5 | Three results per rolling hour, fourth blocked + manual_review | lock before count/insert in `transactions.py`/scoring service; BR5 check runs before BR4 | `test_scoring.py` limit/old/CIC; `test_br_integrity.py` independent simultaneous sessions |
| BR6 | <40 rejected; 40-69 review; >=70 eligible | `scoring_service.py:label_for`; approval API | `test_scoring.py` persisted 0/39/40/69/70/100; `test_scoring_unit.py`, `test_approval.py` |
| BR7 | Encrypt Citizen ID/account fields; masked normal responses; authorized decrypt + one access event per present identifier | `privacy.py`, create/reveal API, `SensitiveData.jsx`; local key initialization; failed audit returns 503 without releasing numbers | `test_privacy.py`: ciphertext, no leaks, authorization, wrong/missing key, failed audit, repeat accesses, null identifiers and forged extra fields; `test_br_integrity.py`: key preservation/migration |
| BR8 | Officer own loans; Manager all + employee management; inactive users denied and old tokens revoked on status changes | current-user dependency; applications/legacy HTML; `routers/users.py`, Employees UI | `test_applications.py`, `test_walking_skeleton.py`, `test_privacy.py`, `test_users.py`: account CRUD/status/session revocation/role guards |
| BR9 | Payment <= loan; payment x term covers loan; invalid requests save nothing, including merged edits | `ApplicationIn._br9_payment_must_cover_loan`, `ApplicationPatch`, and the 422 handler | `test_application_validation.py`; `test_remaining_stories.py`: TC-US10-01/02 |

All nine BRs have implementation and local automated coverage. The rules-based
`rules-v0` scorer is the current implementation; a trained model is planned for
Sprint 4. Scoring history has a stored-data/API implementation, but its US06
history tab and US10 edit/cancel are implemented. US07 notifications remains
absent. Manager approval is an added workflow; processed applications remain
protected from US10 edit/cancel.

**US09 API correction (S4-05):** empty, whitespace-only, null and omitted income
now return exactly "Income is required"; malformed numeric input keeps the
whole-number message. The API preserves the original requirement and saves nothing
on rejection. `test_application_validation.py` covers normalization, limits, body
errors and BR9. US09 remains partially complete until its independent browser
acceptance result is recorded; no new PR/CI/browser outcome is inferred here.

Browser screenshots are present in [ui.md](ui.md#running-app-screenshots), but the
tester/date/result table still needs real acceptance results. Merged PRs above
show delivery; do not infer browser acceptance or a fresh CI status from them.
Sprint commitment/completion records are maintained in [sprint-log.md](sprint-log.md).

## Manager approval (S3-37)

The Officer creates/scores an application and the Manager reaches the same record
through the application list or review queue. Eligible is a recommendation, not
approval. Confirmation calls `PATCH /api/loan-applications/{id}/approve`; approval
persists the decision and access-controlled actor/time metadata. It does not
implement disbursement. US10 is implemented separately through the application
changes router; approval does not unlock editing or cancellation of processed
applications.

| Responsibility | Implementation | Automated coverage |
| --- | --- | --- |
| Admin authorization, latest eligible score, state/CIC guards | [approve_application](../backend/app/routers/applications.py) | [test_approval.py](../backend/tests/test_approval.py): Officer/anonymous denial, missing loan, invalid states/scores, CIC and latest result |
| Persist approved status and one audit; show actor/time after reload | [approve_application / application_detail](../backend/app/routers/applications.py) | `test_manager_approval_persists_actor_time_and_blocks_rescoring`, `test_repeat_approval_does_not_duplicate_audit` |
| High-risk review and BR5 manual-review resolution | Approval API and [ApplicationDetail.jsx](../frontend/src/pages/ApplicationDetail.jsx) | `test_manager_can_review_high_risk_eligible_result`, `test_br5_review_can_be_resolved_by_manager_with_eligible_score` |
| Role guidance, confirmation and decision/error display | [ApplicationDetail.jsx](../frontend/src/pages/ApplicationDetail.jsx), [review.js](../frontend/src/review.js) | API coverage above; `roles.render.test.js` renders routes; browser acceptance pending |

Recorded local check on 2026-10-18: from `backend/`,
`.venv/Scripts/python.exe -B -m pytest tests/test_approval.py -q -p no:cacheprovider`
returned **17 passed**. This validates the API checks, not the browser flow.
Implementation tests were merged in [PR #186](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/186),
and workflow documentation in [PR #191](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/191).
Follow [the approval demo](SETUP.md#11-manager-approval-demo) and record actual
tester/date/results under [ui.md section 4](ui.md#4-what-changed-since-m2).
Screenshots are present; reload persistence and the other unrecorded browser
checks remain pending. No new teammate review or CI result is asserted here.

## Role-focused UI follow-up

US08 (#13) maps to Officer daily overview vs Manager branch summary/review queue;
US05 (#20)/BR8 maps to Manager filters vs Officer own list; approval maps to
role-specific guidance on details. API access scope is unchanged.
[PR #190](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/190)
contains the filters; [PR #189](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/189)
contains `frontend/tests/review.test.js` (queue and filters) and
`roles.render.test.js` (actual route rendering and Manager-only Employees guidance).
[PR #192](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/192)
contains comparison documentation and [PR #193](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/193)
contains UI screenshots. The browser checklist still needs tester/date/results.
US07 notifications remains pending; US06 history UI and US10 edit/cancel are implemented.

## P0 browser regression mapping (2026-10-29)

`frontend/browser/p0.spec.js` runs seven real-browser checks against a disposable
seeded database: US01 login/length/lock; US09 error messages/focus/no-save; US03
saved High risk before slow scoring and single automatic request; US04 persisted
score/CIC/reasons/list navigation; US03 score-failure recovery without duplicates;
US08 0/10 daily records/average and Manager workspace; US09 keyboard/375 px layout.
All seven passed locally. The 523 pytest cases and 52 frontend unit/render tests
also passed; local backend coverage is 96.02%. These results do not assert a new
GitHub PR, teammate review, CI result or LMS submission.
