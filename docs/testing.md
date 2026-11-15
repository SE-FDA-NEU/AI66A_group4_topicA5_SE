# Testing

This document says what the team tests and lists the test cases for the main stories. Test case IDs have the form `TC-<story>-<nn>`, for example `TC-US01-03`.

## 1. What we test and why

Tests live in `backend/tests` (pytest), `frontend/tests` (node:test) and `frontend/browser` (Playwright). The interface is checked by render tests, by the browser regressions in `frontend/browser` and by the local browser results recorded in `docs/ui.md` (section "P0 completion in this copy"). Public page/redeploy checks are recorded in [deployment.md](deployment.md). PR #265 added Incognito public captures and two physical-phone screens, but full independent P0 acceptance remains incomplete: isolated HTTP 422/no-save, current-version persistence, scoring history and complete mobile workflows still need recorded results.

| Layer | Test | Why |
|---|---|---|
| Services | `scoring.py` (rules, `has_history`), `scoring_service.py` (BR1, BR4, BR5, BR6 order), `privacy.py` (masking and encryption). Unit tests that call the functions directly: threshold boundaries, golden cases that pin exact scores and reasons, and boundary tests with a fixed clock (BR5 one-hour cutoff, lock expiry, dashboard day). A few tests use the real clock with a wide margin | The business rules live here, and a wrong score or label is the costliest defect |
| Repository (database) | SQLAlchemy models, constraints, migration, seed. Integration tests on a fresh in-memory SQLite database per test, plus temporary SQLite files for the migration and concurrency checks. The code has no separate repository class, so this layer is tested through the models, the migration and the seed | Constraints and upgrades must not lose or corrupt existing records |
| Routes | FastAPI routers for auth, users, loan applications, scoring, dashboard, approval and application changes. Integration tests through `TestClient` with the same in-memory SQLite: status codes, error messages, access control, and that rejected create requests save nothing | The routes enforce the rules for every caller, whatever the interface does |
| Interface | `validation.js`, `api.js`, `format.js`, React components, the create-and-score flow. `node:test` unit tests (`api.js` with a mocked `fetch`), render tests (esbuild bundles a component and `react-dom/server` renders it to HTML) and Playwright browser regressions (`npm run test:e2e`). The browser tests assert focus, error messages and horizontal overflow at 375 px; the way the page looks is not asserted and is reviewed from the saved screenshots | Users meet the rules through the forms, so validation messages and the create-and-score flow must work end to end |

**Risk.** The educational demo models an Officer's assessment workflow, so the costliest failures are a wrong score or label, a wrong high-risk flag (BR3), a rule applied on the wrong side of a threshold, and invalid data being saved. That is why section 2 tests the main thresholds (lock count, DSR 50%, score bands, hourly scoring limit, Vietnam day) on both sides, and why rejected create requests are checked to leave the record count unchanged. The weakest layer is the visual interface, where only focus and overflow are asserted and the appearance is reviewed by people.

## 2. Test cases

Kind: `API` is an integration test through FastAPI `TestClient` with in-memory SQLite; `Unit` calls a Python function directly. Every case in this section is a pytest case. The P0 stories are US01, US03, US04, US08 and US09 (`docs/requirements.md`); US10 (P1) and US02 (P2) are listed as well. Rows marked "boundary" cover a numeric limit. A limit has a case on each side of its boundary; where one test covers both sides, the row says so. IDs are the exact ones in the test code; the Appendix lists every ID with its file and test name.

### US01 Login and lockout (P0)

| ID | Story | Input | Expected | Kind |
|----|-------|-------|----------|------|
| `TC-US01-01` | US01 | Seeded officer, correct email and password | 200, access token and user with role `user` | API |
| `TC-US01-03` | US01 | Correct email, wrong password | 401 with a message saying the credentials are incorrect | API |
| `TC-US01-04` | US01 | Email that does not exist, any password | 401 | API |
| `TC-US01-13` | US01 | Boundary below the lock: 2 wrong passwords | Both 401; account not locked (`locked_until` empty, counter 2); the 3rd wrong password is 401 and sets the lock | API |
| `TC-US01-05` | US01 | Boundary at the lock: 3 wrong passwords, then the correct password | 4th attempt is 423 with "15 minutes" in the message | API |
| `TC-US01-06` | US01 | 2 wrong passwords, then the correct password | 200 and the failure counter is back to 0 | API |
| `TC-US01-07` | US01 | Boundary lock length: 3 wrong passwords, then read `locked_until` | `locked_until` is 15 minutes after the failures (within the time window of the test run) | API |
| `TC-US01-14` | US01 | Boundary at expiry, both sides, fixed clock: correct password 1 µs before, exactly at and 1 µs after `locked_until` | 423 just before expiry; 200 at expiry and just after | API |
| `TC-US01-08` | US01 | Correct password after the 15-minute lock has expired | 200, failure counter 0 and lock cleared | API |

### US04 Scoring and result label (P0)

| ID | Story | Input | Expected | Kind |
|----|-------|-------|----------|------|
| `TC-US04-01` | US04 | Valid application, score requested | 201, integer score in 0-100, at least 2 explanation lines, current `model_version` | API |
| `TC-US04-03` | US04 | Income 8,000,000, loan 600,000,000, payment 25,000,000, no history, CIC group 2 | Score below 40, label `rejected`, at least 2 reasons, status `rejected` | API |
| `TC-US04-04` | US04 | CIC debt group 3, 4 or 5 (BR4) | Score empty, `rejected_reason` is `cic_bad_debt_group`, model never called | API |
| `TC-US04-15` | US04 | Boundary BR6, both sides: scores 39 and 40, then 69 and 70 | 39 `rejected`, 40 `review`, 69 `review`, 70 `eligible` | Unit |
| `TC-US04-06` | US04 | Same boundary scores 0, 39, 40, 69, 70 and 100 through the API, then reload the application | Stored score, label and status match: 0 and 39 rejected, 40 and 69 review, 70 and 100 eligible | API |
| `TC-US04-07` | US04 | BR5: score one application 3 times, then a 4th time within the hour | The first 3 return 201; the 4th returns 429 with a message naming the manager, and the status becomes `manual_review` | API |
| `TC-US04-47` | US04 | Boundary BR5 window, both sides, fixed clock: 3 earlier scorings that are 1 µs inside the hour, exactly 1 hour old, and 1 µs outside it, then a new scoring | 429 inside the hour and at exactly one hour; 201 outside the hour | API |

### US08 Dashboard (P0)

| ID | Story | Input | Expected | Kind |
|----|-------|-------|----------|------|
| `TC-US08-01` | US08 | Officer with no application today, then 2 created and scored today | First call: total 0 and average score empty, no error. After: total 2 and an average score | API |
| `TC-US08-02` | US08 | Dashboard request without a token | 401 | API |
| `TC-US08-03` | US08 | Boundary: one application created now (counted), then moved 2 days back | Total 1 first; after the move total 0, average score empty, high-risk count 0 | API |
| `TC-US08-04` | US08 | 10 applications created today, 3 of them high risk, scored 10, 20, ... 100 | Total 10, average score 55.0, high-risk count 3 | API |
| `TC-US08-06` | US08 | Access rule: Officer 1 has 2 applications today (scores 20 and 40), Officer 2 has 1 (score 100), then each Officer and the Manager open the dashboard | Each Officer sees only their own applications (Officer 1: total 2, average 30.0; Officer 2: total 1, average 100.0); the Manager sees all 3 with average 53.3 | API |
| `TC-US08-07` | US08 | Boundary of the Vietnam day (UTC+7), both sides, fixed clock: an application created 1 µs before, exactly at and 1 µs after midnight; and 1 µs before, exactly at and 1 µs after the next midnight | The day starts at midnight (included) and ends at the next midnight (excluded): total 0, 1, 1, 1, 0, 0 in that order | API |

### US03 Create a loan application (P0)

| ID | Story | Input | Expected | Kind |
|----|-------|-------|----------|------|
| `TC-US03-01` | US03 | Valid application | 201, status `pending`, no high-risk flag, record saved with the officer as owner | API |
| `TC-US03-02` | US03 | Monthly income 0 (BR2) | 422, "Monthly income must be greater than 0 VND." | API |
| `TC-US03-17` | US03 | Monthly income 0, record count read before and after | 422 and the record count is unchanged (nothing saved) | API |
| `TC-US09-08` | US03 | Boundary BR2 above 0: monthly income 1, and the upper limit 10,000,000,000,000 | 201 and the record count grows by 1 (the same test also accepts the edges of loan amount and estimated payment) | API |
| `TC-US03-15` | US03 | Boundary at 50%: income 20,000,000 and payment 10,000,000 (DSR exactly 50%) | 201, `dsr_flag_high_risk` false, saved as not flagged | API |
| `TC-US03-16` | US03 | Boundary above 50%: payment 10,000,001 (BR3) | 201, `dsr_flag_high_risk` true, application still saved | API |

### US09 Clear error messages for invalid input (P0)

| ID | Story | Input | Expected | Kind |
|----|-------|-------|----------|------|
| `TC-US09-08` | US09 | Normal input: valid whole numbers, including monthly income 1 and 10,000,000,000,000, and digits with spaces around them | 201 and the record count grows by 1 | API |
| `TC-US09-01` | US09 | Body without `monthly_income` | 422, field error "Income is required" and the form message "Please correct the highlighted fields and submit again." | API |
| `TC-US09-03` | US09 | `monthly_income` is an empty string; record count read before and after | 422, field error "Income is required"; record count unchanged | API |
| `TC-US09-04` | US09 | `monthly_income` is only spaces, or a tab and a newline | 422, field error "Income is required" | API |
| `TC-US09-02` | US09 | `monthly_income` is the text "abc" | 422, "Monthly income must be a whole number."; record count unchanged | API |
| `TC-US09-07` | US09 | Monthly income, loan amount and estimated payment, one at a time, each set to: empty, null, text, "12a", "1.5", 1.5, "1_000", "+5", 5,000 digits, -1, 0, or 10,000,000,000,001 | 422 with a message that names the field and says "is required", "must be a whole number", "must be greater than 0" or "must not exceed"; nothing is saved | API |
| `TC-US09-10` | US09 | Boundary loan term, both sides: 0, 1, 600 and 601 months, plus 12.5 and " 12 " | 0, 601 and 12.5 give 422 naming `loan_term_months` and save nothing; 1, 600 and " 12 " give 201 | API |
| `TC-US09-11` | US09 | Boundary CIC debt group, both sides: 0, 1, 5 and 6, plus blank, "2", "x" and 2.5 | 0, 6, "x" and 2.5 give 422 naming `cic_debt_group`; 1, 5, "2" and blank give 201 (blank is saved as not provided) | API |

### US10 Edit/cancel an unprocessed application (P1)

| ID | Story | Input | Expected | Kind |
|----|-------|-------|----------|------|
| `TC-US10-01` | US10 | Partial edit of a pending application with an existing identifier | 200; merged data is valid, BR3 is recalculated, omitted identifier remains unchanged and one edit audit records field names only | API |
| `TC-US10-02` | US10 | Null/invalid/forged/empty edit payload | 422; persisted data and edit-audit count remain unchanged | API |
| `TC-US10-03` | US10 | Edit an already scored/rejected/manual-review/approved/cancelled application | 409 with processed-state message | API |
| `TC-US10-04` | US10 | Confirm cancellation, repeat the request, then score | First and repeated cancel return cancelled; one cancel audit; scoring returns 409 | API |
| `TC-US10-05` | US10 | Another Officer edits, cancels or reads the application's history | 403 for every operation | API |
| `TC-US10-06` | US10 | Cancel an application after scoring | 409 with processed-state message | API |

The two US10 browser cases in `frontend/browser/remaining-stories.spec.js`
cover the real edit/cancel UI and the refusal to edit an approved application.

### US02 Logout and private-response caching (P2)

| ID | Story | Input | Expected | Kind |
|---|---|---|---|---|
| TC-US02-01 | US02 | Two independent logins; logout the first | 204; first token rejected with 401, second remains 200; only SHA-256 fingerprint stored | API |
| TC-US02-02 | US02 | Authenticated GET summary, list and legacy HTML (3 variants) | 200 with Cache-Control no-store and Pragma no-cache | API |
| TC-US02-03 | US02 | Logout without credentials | 401, no revoked-token row | API |

These IDs are comments immediately above their pytest functions in
`backend/tests/test_remaining_stories.py`. The regression
`test_ordinary_detail_is_not_cached_after_logout` in `test_sensitive_data.py`
also requires no-store on masked details. Existing US10 tests remain intact.
`frontend/browser/remaining-stories.spec.js` checks two real browser sessions,
logout 204, cleared storage, Back hiding private UI and rejected old credentials.
A second US02 browser case aborts the logout request, verifies local sign-out
and its unconfirmed-revocation notice, and proves the API never revoked that
test token. Run both from frontend with `npm run test:e2e -- --grep "US02"`;
they use disposable database/keys and the actual local API.

Last full run, on a fresh clone of `main` (2026-10-31 and 2026-11-01): **552
backend cases passed with 95.41% coverage**, Ruff passed, **52 frontend tests**
and the production build passed, and all **14 browser tests** in
`frontend/browser` passed (Windows, Microsoft Edge). This is one local run, not
a GitHub CI result.

## 3. Automated tests

From the repository root, with the backend virtual environment active:

```bash
python -m pip install -r backend/requirements-dev.txt
python -m pytest -v
```

One command runs all pytest cases (`pytest` alone also works from the repository root, because the root `pytest.ini` sets the test folder and import path). No server or real database is required: the tests use an in-memory SQLite database. For the CI coverage gate:

```bash
python -m pytest -v --cov=backend/app --cov-report=term-missing --cov-fail-under=90
```

Last lines of its output:

```text
backend\app\scoring_service.py                  51      0   100%
backend\app\security.py                         28      3    89%   23, 25-26
backend\app\seed.py                             58      9    84%   117-126, 130
backend\app\transactions.py                      6      0   100%
--------------------------------------------------------------------------
TOTAL                                          980     45    95%
Required test coverage of 90% reached. Total coverage: 95.41%
================= 552 passed, 1 warning in 102.62s (0:01:42) ==================
```

From `frontend/`:

```bash
npm ci
npm test
npm run build
npm run test:e2e
```

The optional browser command starts separate servers (8016/5186), seeds disposable SQLite and uses generated test keys. Windows uses installed Edge; other platforms install Chromium once with `npx playwright install chromium`. See SETUP.md for Python/browser overrides. The test output is the ignored `frontend/test-results/` directory.

## 4. What the tests found

**Bug: a saved US03 application was hidden until scoring finished** (issue #226, fixed in PR #233, commit `c325385`).

How it showed up: the new application form waited for `api.score(...)` to return before it opened the Details page. The loan was already saved in the database (201), but if scoring was slow the officer saw no saved record, no "Scoring in progress" status and no High risk warning.

The test that protects it is `US03 saved High risk application is visible before a slow score and scoring runs only once` in `frontend/browser/p0.spec.js`. It holds the score request while the real create API commits the loan, then expects the Application heading to appear. It was added in the same commit as the fix, so the red output below was produced by reverting only the fix (`git checkout c325385^ -- frontend/src/pages/NewApplication.jsx`) on a clean clone and running `npx playwright test browser/p0.spec.js -g "US03 saved High risk"`:

```text
1. US03 saved High risk application is visible before a slow score and scoring runs only once
   Error: expect(locator).toBeVisible() failed
   Locator: getByRole('heading', { name: /^Application /, level: 1 })
   Expected: visible
   Timeout: 8000ms
   Error: element(s) not found
   > 40 |   await expect(page.getByRole("heading", { name: /^Application /, level: 1 })).toBeVisible();
```

Fix: after the 201 response, `NewApplication.jsx` navigates to Details immediately. Details shows the pending status and the High risk warning, and requests the score once, using a one-use flag (`scoreOnOpen`). With the fix the test passes: it sees the saved record before the score request is released, checks that exactly one score request is made, and that reloading the page does not score again. A second test in the same file checks that a 503 from scoring leaves the saved record in place and that retrying does not create a duplicate. Observed save-to-details time: 87 ms on the last run (93 ms in `docs/ui.md`); this is one machine, not a guarantee for others.

These results come from local runs on one machine. They are not a GitHub CI result; the address-bar screenshots and the LMS delivery are separate.

## Appendix: complete test case ID list

Every test with an ID, sorted by ID. Backend IDs are a `# TC-USxx-nn` comment directly above the pytest function; frontend IDs start the title of the `node:test` test. Section 2 describes the main cases; the other IDs (cases for the P1/P2 stories and extra boundary and unit cases) are listed here only.

| ID | File | Test |
|----|------|------|
| `TC-US01-01` | `backend/tests/test_auth.py` | `test_login_returns_token_and_user` |
| `TC-US01-02` | `backend/tests/test_auth.py` | `test_email_is_case_insensitive` |
| `TC-US01-03` | `backend/tests/test_auth.py` | `test_wrong_password_is_401_with_a_clear_message` |
| `TC-US01-04` | `backend/tests/test_auth.py` | `test_unknown_email_gives_the_same_401` |
| `TC-US01-05` | `backend/tests/test_auth.py` | `test_account_locks_after_three_wrong_passwords` |
| `TC-US01-06` | `backend/tests/test_auth.py` | `test_successful_login_resets_the_failure_counter` |
| `TC-US01-07` | `backend/tests/test_auth.py` | `test_lock_duration_is_fifteen_minutes` |
| `TC-US01-08` | `backend/tests/test_auth.py` | `test_login_succeeds_after_lock_expires` |
| `TC-US01-09` | `backend/tests/test_auth.py` | `test_invalid_login_input_is_422_and_not_counted_as_a_failure` |
| `TC-US01-10` | `backend/tests/test_auth.py` | `test_login_edge_lengths_are_accepted_as_input` |
| `TC-US01-11` | `backend/tests/test_auth.py` | `test_malformed_login_body_is_422_and_not_counted` |
| `TC-US01-12` | `backend/tests/test_auth.py` | `test_validation_error_does_not_add_to_an_existing_failure_count` |
| `TC-US01-13` | `backend/tests/test_m4_boundaries.py` | `test_two_wrong_passwords_do_not_lock_but_the_third_does` |
| `TC-US01-14` | `backend/tests/test_auth_lock_boundary.py` | `test_login_lock_boundary_at_fifteen_minutes` |
| `TC-US01-30` | `backend/tests/test_users_boundaries.py` | `test_full_name_length_boundaries_on_create` |
| `TC-US01-31` | `backend/tests/test_users_boundaries.py` | `test_email_length_boundaries_on_create` |
| `TC-US01-32` | `backend/tests/test_users_boundaries.py` | `test_malformed_email_is_rejected` |
| `TC-US01-33` | `backend/tests/test_users_boundaries.py` | `test_password_length_boundaries_on_create` |
| `TC-US01-34` | `backend/tests/test_users_boundaries.py` | `test_non_string_values_are_rejected_on_create` |
| `TC-US01-35` | `backend/tests/test_users_boundaries.py` | `test_missing_field_is_rejected_on_create` |
| `TC-US01-36` | `backend/tests/test_users_boundaries.py` | `test_empty_patch_body_is_rejected` |
| `TC-US01-37` | `backend/tests/test_users_boundaries.py` | `test_unknown_patch_field_is_rejected_and_nothing_changes` |
| `TC-US01-38` | `backend/tests/test_users_boundaries.py` | `test_full_name_boundaries_on_patch` |
| `TC-US01-39` | `backend/tests/test_users_boundaries.py` | `test_is_active_must_be_a_real_bool` |
| `TC-US01-40` | `backend/tests/test_users_boundaries.py` | `test_manager_targets_are_forbidden_for_every_patch_field` |
| `TC-US01-41` | `backend/tests/test_users_boundaries.py` | `test_duplicate_email_in_a_different_case_is_conflict` |
| `TC-US01-42` | `backend/tests/test_users_boundaries.py` | `test_email_is_stored_lowercase_and_trimmed` |
| `TC-US01-50` | `backend/tests/test_access_control.py` | `test_deactivated_officer_token_is_401_on_every_protected_route` |
| `TC-US01-51` | `backend/tests/test_access_control.py` | `test_deactivated_manager_token_is_401_on_every_protected_route` |
| `TC-US01-60` | `frontend/tests/api.test.js` | network failure becomes ApiError(0) with the fallback text |
| `TC-US01-61` | `frontend/tests/api.test.js` | a request that takes 15 seconds is aborted with a timeout message |
| `TC-US01-62` | `frontend/tests/api.test.js` | a 401 with a token calls the unauthorized handler |
| `TC-US01-63` | `frontend/tests/api.test.js` | a 401 without a token does not call the unauthorized handler |
| `TC-US01-64` | `frontend/tests/api.test.js` | a 422 passes field errors through .fields |
| `TC-US01-65` | `frontend/tests/api.test.js` | a non-JSON error body falls back to the status message |
| `TC-US01-66` | `frontend/tests/api.test.js` | statuses 409, 422, 423, 429 and 503 have their own fallback message |
| `TC-US01-67` | `frontend/tests/api.test.js` | an unknown status falls back to the 500 message |
| `TC-US02-01` | `backend/tests/test_remaining_stories.py` | `test_logout_revokes_only_the_current_session_and_discards_raw_token` |
| `TC-US02-02` | `backend/tests/test_remaining_stories.py` | `test_protected_data_is_not_http_cached_after_logout` |
| `TC-US02-03` | `backend/tests/test_remaining_stories.py` | `test_logout_without_a_session_is_401` |
| `TC-US03-01` | `backend/tests/test_applications.py` | `test_create_saves_a_pending_application` |
| `TC-US03-02` | `backend/tests/test_applications.py` | `test_br2_zero_income_is_rejected_with_a_clear_message` |
| `TC-US03-03` | `backend/tests/test_applications.py` | `test_all_field_errors_are_reported_together` |
| `TC-US03-04` | `backend/tests/test_applications.py` | `test_cic_group_must_be_1_to_5` |
| `TC-US03-05` | `backend/tests/test_application_validation.py` | `test_br9_one_dong_payment_on_a_large_loan_is_rejected` |
| `TC-US03-06` | `backend/tests/test_application_validation.py` | `test_br9_payment_above_the_loan_amount_is_rejected` |
| `TC-US03-07` | `backend/tests/test_application_validation.py` | `test_br9_payment_times_term_equal_to_loan_is_accepted` |
| `TC-US03-08` | `backend/tests/test_application_validation.py` | `test_br9_boundary_one_dong_over_is_rejected` |
| `TC-US03-09` | `backend/tests/test_application_validation.py` | `test_br9_is_skipped_when_loan_fields_are_invalid` |
| `TC-US03-10` | `frontend/tests/validation.test.js` | citizen ID accepts 9 or 12 digits and blank |
| `TC-US03-11` | `frontend/tests/validation.test.js` | citizen ID rejects wrong length, letters and separators |
| `TC-US03-12` | `frontend/tests/validation.test.js` | bank account accepts 6 to 20 digits, rejects 5 and 21 |
| `TC-US03-13` | `frontend/tests/validation.test.js` | identifier longer than 32 raw characters reports the length limit |
| `TC-US03-14` | `frontend/tests/validation.test.js` | non-ASCII digits are rejected in identifiers |
| `TC-US03-15` | `backend/tests/test_m4_boundaries.py` | `test_br3_dsr_exactly_50_percent_is_saved_and_not_flagged` |
| `TC-US03-16` | `backend/tests/test_m4_boundaries.py` | `test_br3_dsr_one_dong_above_50_percent_is_flagged_and_saved` |
| `TC-US03-17` | `backend/tests/test_m4_boundaries.py` | `test_br2_zero_income_saves_nothing` |
| `TC-US04-01` | `backend/tests/test_scoring.py` | `test_score_is_an_integer_with_explanations` |
| `TC-US04-02` | `backend/tests/test_scoring.py` | `test_same_input_gives_same_score` |
| `TC-US04-03` | `backend/tests/test_scoring.py` | `test_low_score_is_rejected_with_at_least_two_reasons` |
| `TC-US04-04` | `backend/tests/test_scoring.py` | `test_br4_bad_debt_group_is_rejected_without_calling_the_model` |
| `TC-US04-05` | `backend/tests/test_scoring.py` | `test_br1_out_of_range_score_is_hidden_and_goes_to_manual_review` |
| `TC-US04-06` | `backend/tests/test_scoring.py` | `test_br1_br6_boundaries_persist_after_reload` |
| `TC-US04-07` | `backend/tests/test_scoring.py` | `test_br5_fourth_scoring_in_an_hour_is_blocked` |
| `TC-US04-08` | `backend/tests/test_scoring.py` | `test_br5_old_scorings_do_not_count` |
| `TC-US04-09` | `backend/tests/test_scoring.py` | `test_br3_high_risk_flag_stays_even_with_a_good_score` |
| `TC-US04-10` | `backend/tests/test_scoring.py` | `test_cancelled_application_cannot_be_scored` |
| `TC-US04-11` | `backend/tests/test_scoring.py` | `test_score_history_lists_every_attempt` |
| `TC-US04-12` | `backend/tests/test_scoring.py` | `test_user_cannot_score_someone_elses_application` |
| `TC-US04-13` | `backend/tests/test_scoring.py` | `test_br5_also_limits_cic_rejections` |
| `TC-US04-14` | `backend/tests/test_scoring.py` | `test_br1_fractional_score_is_hidden` |
| `TC-US04-15` | `backend/tests/test_scoring_unit.py` | `test_br6_label_boundaries` |
| `TC-US04-16` | `backend/tests/test_scoring_unit.py` | `test_model_stays_inside_0_100_for_extreme_inputs` |
| `TC-US04-17` | `backend/tests/test_scoring_unit.py` | `test_features_treat_none_as_no_history` |
| `TC-US04-18` | `backend/tests/test_scoring_unit.py` | `test_br4_rejects_without_calling_the_model` |
| `TC-US04-19` | `backend/tests/test_scoring_unit.py` | `test_br5_blocks_the_fourth_scoring` |
| `TC-US04-20` | `backend/tests/test_scoring_unit.py` | `test_br1_hides_an_out_of_range_score` |
| `TC-US04-21` | `backend/tests/test_scoring_unit.py` | `test_approved_or_cancelled_cannot_be_scored` |
| `TC-US04-22` | `backend/tests/test_scoring_rules.py` | `test_dsr_thresholds_both_sides` |
| `TC-US04-23` | `backend/tests/test_scoring_rules.py` | `test_loan_to_annual_income_thresholds_both_sides` |
| `TC-US04-24` | `backend/tests/test_scoring_rules.py` | `test_term_threshold_at_48_and_49_months` |
| `TC-US04-25` | `backend/tests/test_scoring_rules.py` | `test_cic_group_none_1_and_2` |
| `TC-US04-26` | `backend/tests/test_scoring_rules.py` | `test_credit_history_flag` |
| `TC-US04-27` | `backend/tests/test_scoring_rules.py` | `test_best_case_is_95_with_no_negative_reason` |
| `TC-US04-28` | `backend/tests/test_scoring_rules.py` | `test_worst_raw_value_minus_15_is_clamped_to_zero` |
| `TC-US04-29` | `backend/tests/test_scoring_rules.py` | `test_score_is_never_below_zero_or_above_95_across_the_grid` |
| `TC-US04-30` | `backend/tests/test_br5_window.py` | `test_three_scorings_59_minutes_ago_still_block_the_fourth` |
| `TC-US04-31` | `backend/tests/test_br5_window.py` | `test_three_scorings_61_minutes_ago_do_not_block` |
| `TC-US04-32` | `backend/tests/test_br5_window.py` | `test_only_scorings_inside_the_window_are_counted` |
| `TC-US04-33` | `backend/tests/test_scoring_unit.py` | `test_has_history_false_for_no_history_phrases` |
| `TC-US04-34` | `backend/tests/test_scoring_unit.py` | `test_has_history_true_for_real_notes` |
| `TC-US04-35` | `backend/tests/test_scoring_golden.py` | `test_golden_eligible_case` |
| `TC-US04-36` | `backend/tests/test_scoring_golden.py` | `test_golden_review_case` |
| `TC-US04-37` | `backend/tests/test_scoring_golden.py` | `test_golden_rejected_low_score_case` |
| `TC-US04-38` | `backend/tests/test_scoring_golden.py` | `test_golden_no_history_phrase_case` |
| `TC-US04-39` | `backend/tests/test_scoring_golden.py` | `test_model_version_is_rules_v1` |
| `TC-US04-40` | `backend/tests/test_walking_skeleton.py` | `test_every_non_pending_seeded_application_has_a_scoring_result` |
| `TC-US04-41` | `backend/tests/test_walking_skeleton.py` | `test_seed_shows_every_result_band_and_stays_clear_of_br5` |
| `TC-US04-42` | `frontend/tests/scorecard.render.test.js` | ScoreCard shows a normal score with model version and time |
| `TC-US04-43` | `frontend/tests/scorecard.render.test.js` | ScoreCard lists at least two reasons for a score below 40 |
| `TC-US04-44` | `frontend/tests/scorecard.render.test.js` | ScoreCard shows a CIC rejection with - instead of a score |
| `TC-US04-45` | `frontend/tests/scorecard.render.test.js` | ScoreCard shows the invalid-score notice and no score |
| `TC-US04-46` | `frontend/tests/scorecard.render.test.js` | ScoreCard says an unscored application has not been scored |
| `TC-US04-47` | `backend/tests/test_br5_window.py` | `test_scoring_window_cutoff_is_inclusive_and_uses_a_fixed_clock` |
| `TC-US05-01` | `backend/tests/test_access_control.py` | `test_odd_application_ids_give_404_never_500` |
| `TC-US05-02` | `backend/tests/test_access_control.py` | `test_officer_gets_403_on_another_officers_application` |
| `TC-US05-03` | `backend/tests/test_access_control.py` | `test_other_officers_application_is_not_changed_by_a_blocked_score` |
| `TC-US05-10` | `frontend/tests/api.test.js` | isRetryable is true only for network and 5xx errors |
| `TC-US05-11` | `frontend/tests/notfound.render.test.js` | unknown URLs show Page not found with a link home for both signed-in and signed-out users |
| `TC-US06-01` | `frontend/tests/api.test.js` | api.scoreHistory requests the scores of the application |
| `TC-US06-02` | `frontend/tests/format.test.js` | formatDateTime shows dd/MM/yyyy HH:mm in Vietnam time |
| `TC-US06-03` | `frontend/tests/format.test.js` | formatDateTime moves a UTC time across midnight |
| `TC-US06-04` | `frontend/tests/format.test.js` | formatDateTime returns - for null or invalid values |
| `TC-US06-05` | `frontend/tests/scorecard.render.test.js` | ScoreHistory lists each attempt with time, score, label and model version |
| `TC-US06-06` | `frontend/tests/scorecard.render.test.js` | ScoreHistory shows a message when there is no history |
| `TC-US06-10` | `backend/tests/test_remaining_stories.py` | `test_history_contains_exactly_two_persisted_attempts_and_empty_before_scoring` |
| `TC-US07-01` | `backend/tests/test_remaining_stories.py` | `test_notification_is_immediate_persistent_and_per_manager` |
| `TC-US07-02` | `backend/tests/test_remaining_stories.py` | `test_notifications_are_manager_only_and_missing_event_is_clear` |
| `TC-US07-03` | `backend/tests/test_remaining_stories.py` | `test_cancelled_or_approved_applications_leave_active_notifications` |
| `TC-US08-01` | `backend/tests/test_applications.py` | `test_dashboard_counts_todays_applications` |
| `TC-US08-02` | `backend/tests/test_applications.py` | `test_dashboard_requires_login` |
| `TC-US08-03` | `backend/tests/test_m4_boundaries.py` | `test_dashboard_ignores_applications_created_before_today` |
| `TC-US08-04` | `backend/tests/test_dashboard.py` | `test_dashboard_counts_ten_applications_and_exact_average` |
| `TC-US08-05` | `backend/tests/test_dashboard.py` | `test_dashboard_averages_only_latest_non_null_score_per_application` |
| `TC-US08-06` | `backend/tests/test_dashboard.py` | `test_dashboard_scopes_count_average_and_risk_by_officer_and_manager` |
| `TC-US08-07` | `backend/tests/test_dashboard.py` | `test_dashboard_vietnam_day_includes_start_and_excludes_end` |
| `TC-US09-01` | `backend/tests/test_applications.py` | `test_us09_missing_income_names_the_field` |
| `TC-US09-02` | `backend/tests/test_applications.py` | `test_us09_text_income_is_rejected_and_nothing_is_saved` |
| `TC-US09-03` | `backend/tests/test_applications.py` | `test_us09_empty_string_income_is_reported_as_required` |
| `TC-US09-04` | `backend/tests/test_application_validation.py` | `test_us09_whitespace_income_is_reported_as_required` |
| `TC-US09-05` | `backend/tests/test_application_validation.py` | `test_us09_null_income_is_reported_as_required` |
| `TC-US09-06` | `backend/tests/test_application_validation.py` | `test_us09_boolean_is_not_a_whole_number` |
| `TC-US09-07` | `backend/tests/test_application_validation.py` | `test_us09_money_field_rejections_save_nothing` |
| `TC-US09-08` | `backend/tests/test_application_validation.py` | `test_us09_money_field_accepted_edges` |
| `TC-US09-09` | `backend/tests/test_application_validation.py` | `test_us09_blank_cic_group_means_not_provided` |
| `TC-US09-10` | `backend/tests/test_application_validation.py` | `test_us09_loan_term_edges` |
| `TC-US09-11` | `backend/tests/test_application_validation.py` | `test_us09_cic_group_edges` |
| `TC-US09-12` | `backend/tests/test_application_validation.py` | `test_us09_text_length_limit_500` |
| `TC-US09-13` | `backend/tests/test_application_validation.py` | `test_us09_limit_applies_after_trimming_whitespace` |
| `TC-US09-14` | `backend/tests/test_application_validation.py` | `test_us09_vietnamese_text_is_stored_intact` |
| `TC-US09-15` | `backend/tests/test_application_validation.py` | `test_us09_blank_optional_text_is_stored_as_null` |
| `TC-US09-16` | `backend/tests/test_application_validation.py` | `test_us09_optional_text_must_be_text` |
| `TC-US09-17` | `backend/tests/test_application_validation.py` | `test_us09_each_message_branch` |
| `TC-US09-18` | `backend/tests/test_application_validation.py` | `test_us09_malformed_json_is_reported_on_form` |
| `TC-US09-19` | `backend/tests/test_application_validation.py` | `test_us09_non_object_body_is_reported_on_form` |
| `TC-US09-20` | `backend/tests/test_application_validation.py` | `test_us09_fallback_message_for_other_error_types` |
| `TC-US09-21` | `frontend/tests/validation.test.js` | a valid form returns no errors |
| `TC-US09-22` | `frontend/tests/validation.test.js` | empty form reports the four required fields |
| `TC-US09-23` | `frontend/tests/validation.test.js` | whitespace-only income is required |
| `TC-US09-24` | `frontend/tests/validation.test.js` | text and decimals are not whole numbers |
| `TC-US09-25` | `frontend/tests/validation.test.js` | income must be greater than 0 VND, 1 accepted |
| `TC-US09-26` | `frontend/tests/validation.test.js` | loan, term and payment must be greater than 0 |
| `TC-US09-27` | `frontend/tests/validation.test.js` | money upper limit 10^13 accepted, one above rejected |
| `TC-US09-28` | `frontend/tests/validation.test.js` | very long digit strings do not crash and exceed the limit |
| `TC-US09-29` | `frontend/tests/validation.test.js` | loan term limit 600 accepted, 601 rejected |
| `TC-US09-30` | `frontend/tests/validation.test.js` | CIC debt group blank is allowed, 1 to 5 accepted |
| `TC-US09-31` | `frontend/tests/validation.test.js` | CIC debt group below 1, above 5 and text are rejected |
| `TC-US09-32` | `frontend/tests/validation.test.js` | purpose and credit history: 500 chars accepted, 501 rejected |
| `TC-US09-33` | `frontend/tests/validation.test.js` | text length is measured after trimming |
| `TC-US09-34` | `frontend/tests/validation.test.js` | BR9 payment equal to loan is accepted, one above rejected |
| `TC-US09-35` | `frontend/tests/validation.test.js` | BR9 payment times term equal to loan accepted, one below rejected |
| `TC-US09-36` | `frontend/tests/validation.test.js` | BR9 is skipped when loan, term or payment is itself invalid |
| `TC-US10-01` | `backend/tests/test_remaining_stories.py` | `test_partial_edit_revalidates_merged_data_flags_risk_and_preserves_identifiers` |
| `TC-US10-02` | `backend/tests/test_remaining_stories.py` | `test_invalid_edit_saves_nothing_and_creates_no_audit` |
| `TC-US10-03` | `backend/tests/test_remaining_stories.py` | `test_processed_loans_cannot_be_edited` |
| `TC-US10-04` | `backend/tests/test_remaining_stories.py` | `test_cancel_is_persistent_audited_idempotent_and_cannot_be_scored` |
| `TC-US10-05` | `backend/tests/test_remaining_stories.py` | `test_another_officer_cannot_edit_cancel_or_read_history` |
| `TC-US10-06` | `backend/tests/test_remaining_stories.py` | `test_scored_loan_cannot_be_cancelled` |

`scripts/postgres_smoke.py` uses an isolated
schema in a disposable PostgreSQL database for actual migration, seed, health,
create/edit, BR5, approval persistence, rejected-input no-save and logout checks.
The existing M4 P0 and role browser suite remains part of CI.

## M5 verification and evidence boundary

Verified main CI baseline on 2026-11-11: [run 43048831988](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/actions/runs/43048831988), commit
`12ac633` (push to `main`, success), matching the live `X-App-Commit` at that check.
This is recorded GitHub evidence, not a new local test count or proof of every P0
workflow. Historical baselines: 2026-11-09 [run 42505446604](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/actions/runs/42505446604),
commit `cd273ab` (about 2m 55s), and 2026-11-11 earlier run 43028281516, commit `eee6938`.

The production checks cover database/secret/build guards, opt-in repeatable seed,
health 200/503, safe logging and SPA boundaries in `test_m5_operations.py`; backup
encryption/error handling is in `test_database_backup.py`. `scripts/postgres_smoke.py`
uses an isolated schema on disposable PostgreSQL for migration/seed/concurrency,
health, create/edit/BR5/approval/persistence and logout. Never pass production DB URLs.

From the repository root, backend environment active:

```bash
python -m ruff check backend scripts
python -m pytest -v --cov=backend/app --cov-report=term-missing --cov-fail-under=90
python scripts/postgres_smoke.py
```

The last command requires M5_TEST_POSTGRES_URL set to a disposable PG database.
Frontend npm test/build and Playwright commands remain as documented above.
Playwright currently starts isolated API/Vite servers; recorded captures do not replace isolated HTTP 422/no-save, current-version persistence, full P0 mobile acceptance or rollback evidence. Scoring remains rules-v1 without a
training dependency. See [operations](operations.md) and
[the evidence checklist](images/operations/README.md).
