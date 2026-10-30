# Testing

This document says what the team tests and lists the test cases for the main stories. Test case IDs have the form `TC-<story>-<nn>`, for example `TC-US01-03`.

## 1. What we test and why

All tests live in `backend/tests` (pytest), `frontend/tests` (node:test) and `frontend/browser` (one real-browser regression for the P0 create-and-score flow). The interface is checked by render tests, by that browser regression and by the browser acceptance checklist in `docs/ui.md`; unrecorded checks remain pending.

| Layer | Code | Test kind | Where |
|-------|------|-----------|-------|
| Services and domain logic | `scoring.py` (rules, `has_history`), `scoring_service.py` (BR1, BR4, BR5, BR6 order), `privacy.py` (masking and encryption) | Unit tests that call the functions directly, including threshold boundaries, golden cases that pin exact scores and reasons, and the BR5 window with a fixed clock at the one-hour cutoff | `test_scoring_unit.py`, `test_scoring_rules.py`, `test_br5_window.py`, `test_scoring_golden.py`, `test_privacy.py` |
| Repository and database | SQLAlchemy models, constraints, migration, seed | Integration tests on an in-memory SQLite database created fresh for each test. No separate repository class exists, so this layer is tested through the models, the migration and the seed | `test_models.py`, `test_br_integrity.py`, `test_migration.py`, `test_walking_skeleton.py` |
| API routes | FastAPI routers for auth, users, loan applications, scoring, dashboard, approval and application changes | Integration tests through FastAPI `TestClient` with the same in-memory SQLite, covering status codes, error messages, access control and that nothing is saved after a 422 | `test_auth.py`, `test_applications.py`, `test_application_validation.py`, `test_scoring.py`, `test_access_control.py`, `test_users.py`, `test_users_boundaries.py`, `test_approval.py`, `test_m4_boundaries.py`, `test_dashboard.py`, `test_auth_lock_boundary.py`, `test_remaining_stories.py` |
| Interface (frontend) | `validation.js`, `api.js`, `format.js`, React components, the create-and-score flow | `node:test`. Pure modules (`validation.js`, `api.js` with a mocked `fetch`, `format.js`) are unit tested. Components are render tests: esbuild bundles the component and `react-dom/server` renders it to HTML. The P0 create-and-score flow (submit, navigation to Details, pending state, delayed or failed scoring, persisted result) has a real-browser regression run with `npm run test:e2e`. Other browser behaviour (focus, layout at 375px) has no automated test; the checklist in `docs/ui.md` describes those checks, with results pending until a tester records them | `validation.test.js`, `api.test.js`, `format.test.js`, `scorecard.render.test.js`, `notfound.render.test.js`, `roles.render.test.js`, `review.test.js`, `frontend/browser/p0.spec.js` |

**Risk.** The product helps a loan officer decide on a real person's credit, so the costliest failures are a wrong score or label, a wrong flag (BR3), a rule applied on the wrong side of a threshold, and data saved from an invalid form. That is why the scoring and validation code is tested on both sides of every boundary, and why every rejected request is checked for an unchanged record count. Access control and secret handling are tested because a leak of personal data cannot be undone. The weakest layer is the visual layout: it still needs the recorded manual browser check.

## 2. Test cases

Kind: `API` is an integration test through FastAPI `TestClient` with in-memory SQLite; `Unit` calls a Python function directly. Every case in this section is a pytest case. Rows marked "boundary" cover a limit, and each limit has a row for both sides. IDs are the exact ones in the test code; the Appendix gives the file and test name.

### US01 Login and lockout

| ID | Story | Input | Expected | Kind |
|----|-------|-------|----------|------|
| `TC-US01-01` | US01 | Seeded officer, correct email and password | 200, access token and user with role `user` | API |
| `TC-US01-03` | US01 | Correct email, wrong password | 401 with a message saying the credentials are incorrect | API |
| `TC-US01-13` | US01 | Boundary below the lock: 2 wrong passwords | Both 401; account not locked (`locked_until` empty, counter 2); the 3rd wrong password is 401 and sets the lock | API |
| `TC-US01-05` | US01 | Boundary at the lock: 3 wrong passwords, then the correct password | 4th attempt is 423 with "15 minutes" in the message | API |
| `TC-US01-06` | US01 | 2 wrong passwords, then the correct password | 200 and the failure counter is back to 0 | API |
| `TC-US01-08` | US01 | Correct password after the 15-minute lock has expired | 200 | API |

### US04 Scoring and result label

| ID | Story | Input | Expected | Kind |
|----|-------|-------|----------|------|
| `TC-US04-01` | US04 | Valid application, score requested | 201, integer score in 0-100, at least 2 explanation lines, current `model_version` | API |
| `TC-US04-03` | US04 | Income 8,000,000, loan 600,000,000, payment 6,000,000, no history, CIC group 2 | Score below 40, label `rejected`, at least 2 reasons, status `rejected` | API |
| `TC-US04-04` | US04 | CIC debt group 3, 4 or 5 (BR4) | Score empty, `rejected_reason` is `cic_bad_debt_group`, model never called | API |
| `TC-US04-15` | US04 | Boundary BR6, both sides: scores 39 and 40, then 69 and 70 | 39 `rejected`, 40 `review`, 69 `review`, 70 `eligible` | Unit |
| `TC-US04-06` | US04 | Same boundary scores 0, 39, 40, 69, 70 and 100 through the API, then reload the application | Stored score, label and status match: 39 rejected, 40 and 69 review, 70 eligible | API |

### US08 Dashboard

| ID | Story | Input | Expected | Kind |
|----|-------|-------|----------|------|
| `TC-US08-01` | US08 | Officer with no application today, then 2 created and scored today | First call: total 0 and average score empty, no error. After: total 2 and an average score | API |
| `TC-US08-02` | US08 | Dashboard request without a token | 401 | API |
| `TC-US08-03` | US08 | Boundary: one application created now (counted), then moved 2 days back | Total 1 first; after the move total 0, average score empty, high-risk count 0 | API |

### US03 Create a loan application

| ID | Story | Input | Expected | Kind |
|----|-------|-------|----------|------|
| `TC-US03-01` | US03 | Valid application | 201, status `pending`, no high-risk flag, record saved with the officer as owner | API |
| `TC-US03-02` | US03 | Monthly income 0 (BR2) | 422, "Monthly income must be greater than 0 VND." | API |
| `TC-US03-17` | US03 | Monthly income 0, record count read before and after | 422 and the record count is unchanged (nothing saved) | API |
| `TC-US03-15` | US03 | Boundary at 50%: income 20,000,000 and payment 10,000,000 (DSR exactly 50%) | 201, `dsr_flag_high_risk` false, saved as not flagged | API |
| `TC-US03-16` | US03 | Boundary above 50%: payment 10,000,001 (BR3) | 201, `dsr_flag_high_risk` true, application still saved | API |

### US09 Clear error messages for invalid input

| ID | Story | Input | Expected | Kind |
|----|-------|-------|----------|------|
| `TC-US09-01` | US09 | Body without `monthly_income` | 422, "Monthly income is required." and the form message "Please correct the highlighted fields and submit again." | API |
| `TC-US09-02` | US09 | `monthly_income` is the text "abc" | 422, "Monthly income must be a whole number."; record count unchanged | API |

### US10 Edit/cancel an unprocessed application

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

## 3. Automated tests

From the repository root, with the backend virtual environment active:

```bash
python -m pip install -r backend/requirements-dev.txt
python -m pytest -v
```

One command runs all pytest cases. No server or real database is required. For the CI coverage gate:

```bash
python -m pytest -v --cov=backend/app --cov-report=term-missing --cov-fail-under=90
```

From `frontend/`:

```bash
npm ci
npm test
npm run build
npm run test:e2e
```

The optional browser command starts separate servers (8016/5186), seeds disposable SQLite and uses generated test keys. Windows uses installed Edge; other platforms install Chromium once with `npx playwright install chromium`. See SETUP.md for Python/browser overrides. The test output is the ignored `frontend/test-results/` directory.

This file lists the commands only. Pass counts and coverage figures are not recorded here; they are recorded once, in the final integrated version of this document.

## 4. What the tests found

**US03 saved data was hidden until scoring finished.** The regression in `frontend/browser/p0.spec.js`, named "US03 saved High risk application is visible before a slow score and scoring runs only once", deliberately holds the score request while allowing the real create API to commit the loan. Before the fix, it failed waiting 8 seconds for the Application heading: the form still awaited `api.score` before navigating, although the loan was already in SQLite.

Fix: New application navigates immediately after 201; Details shows pending/High risk and consumes a one-use automatic-score flag. The test now passes, observes the saved record before the predictor runs, checks exactly one request and no automatic re-score after reload. A separate 503 regression checks saved-record recovery and retry without duplicates. Observed save-to-details: **93 ms** on this machine, not a cross-machine guarantee.

These results are local verification of this copy. Independent teammate review, clean-clone checks, address-bar screenshots, GitHub CI/PR evidence and LMS delivery are not inferred from them.

## Appendix: complete test case ID list

### Complete ID mapping

Every test with an ID, sorted by ID. Backend IDs are a `# TC-USxx-nn` comment directly above the test function.

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
| `TC-US01-13` | `backend/tests/test_m4_boundaries.py` | `test_two_wrong_passwords_do_not_lock_but_the_third_does` |
| `TC-US03-01` | `backend/tests/test_applications.py` | `test_create_saves_a_pending_application` |
| `TC-US03-02` | `backend/tests/test_applications.py` | `test_br2_zero_income_is_rejected_with_a_clear_message` |
| `TC-US03-03` | `backend/tests/test_applications.py` | `test_all_field_errors_are_reported_together` |
| `TC-US03-04` | `backend/tests/test_applications.py` | `test_cic_group_must_be_1_to_5` |
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
| `TC-US08-01` | `backend/tests/test_applications.py` | `test_dashboard_counts_todays_applications` |
| `TC-US08-02` | `backend/tests/test_applications.py` | `test_dashboard_requires_login` |
| `TC-US08-03` | `backend/tests/test_m4_boundaries.py` | `test_dashboard_ignores_applications_created_before_today` |
| `TC-US09-01` | `backend/tests/test_applications.py` | `test_us09_missing_income_names_the_field` |
| `TC-US09-02` | `backend/tests/test_applications.py` | `test_us09_text_income_is_rejected_and_nothing_is_saved` |
