# Sprint log 3

## Sprint 3 - <dd/mm/yyyy> to <dd/mm/yyyy>

**Roles this sprint:** Product Owner: Đỗ Quang Trung. Scrum Master: Nguyễn Quang Huy (different from Sprint 1 Thành and Sprint 2 Hải).

Milestone 3 proves that people can use the product: every P0 story works from start to finish through the interface, with real data from the database, and every error gives a clear message.

### Sprint goal
A person who has never seen the app can log in, enter a loan application, see its score with the reasons, and read the dashboard, without typing a URL. When they break a business rule on purpose, a clear message appears.

### Parent stories (P0)
Story Points belong to stories (US01=3, US03=5, US04=5, US08=3, US09=3): proposed commitment 19 points, subject to team Planning Poker. Task estimates below are hours only; do not add task estimates to velocity.

| Story | Issue | Route |
|-------|-------|-------|
| US01 Log in | #9 | `/` |
| US03 Input a loan application | #10 | `/loan-applications/new` |
| US04 View the credit score with explanations | #11 | `/loan-applications/:id` |
| US08 Overview dashboard | #13 | `/dashboard` |
| US09 Alert on missing or malformed data | #14 | `/loan-applications/new` |

### Committed

**Estimation:** use relative 1/2/3/5/8 Story Points and split an 8-point story. Hours are independent task planning estimates, never a conversion to Points.

Issue titles follow the board convention: `[Task] ...`, `[Chore] ...`. Branch names use the issue number once it exists: `<issue>-<short-description>`. Roles follow `process.md` section 1.

#### Tasks

| Ref | Issue title | Parent | Owner | Task Points | Estimated hours |
|-----|-------------|--------|-------|--------|------|
| S3-01 | [Task] Add password hashing, JWT creation and the "current user" dependency | #9 | Trung | — | ~2 h |
| S3-02 | [Task] Build `POST /api/auth/login` with the 15-minute lock after 3 wrong passwords, and `GET /api/auth/me` | #9 | Trung | — | ~2 h |
| S3-03 | [Task] Give the 3 seed accounts a test password in `seed.py` | #9 | Trung | — | ~1 h |
| S3-04 | [Task] Write tests for login, lock-out and protected routes (`test_auth.py`) | #9 | Trung | — | ~2 h |
| S3-05 | [Task] Build `POST /api/loan-applications` with the BR3 high-risk flag and an audit event | #10 | Trung | — | ~2 h |
| S3-06 | [Task] Add field-level validation with BR2 and one message per field (US09) | #14 | Trung | — | ~2 h |
| S3-07 | [Task] Build `GET /api/loan-applications` (list) and `GET /api/loan-applications/{id}` with BR8 (403 and 404) | #11 | Trung | — | ~2 h |
| S3-08 | [Task] Build `POST /api/loan-applications/{id}/score` and `GET .../scores` on top of the scoring service | #11 | Trung | — | ~1 h |
| S3-09 | [Task] Build `GET /api/dashboard/summary` (today's total, average score, high-risk count) | #13 | Trung | — | ~2 h |
| S3-10 | [Task] Update `design.md` (API table, "What changed since M2") and update `changelog.md` | M3 docs | Trung | — | ~2 h |
| S3-11 | [Task] Write `scoring.py`: features and the rule-based model `rules-v0` | #11 | Thành | — | ~3 h |
| S3-12 | [Task] Write `scoring_service.py` with BR4, BR5, BR1 and BR6, in the order from `design.md` | #11 | Thành | — | ~4 h |
| S3-13 | [Task] Write unit tests for the scoring module and service (`test_scoring_unit.py`) | #11 | Thành | — | ~2 h |
| S3-14 | [Task] Write API tests for scoring: rejected, BR1, BR4, BR5, history, 403 (`test_scoring.py`) | #11 | Thành | — | ~2 h |
| S3-15 | [Task] Write API tests for applications: BR2, BR3, BR8, US09 messages, dashboard (`test_applications.py`) | #10, #13, #14 | Thành | — | ~3 h |
| S3-16 | [Task] Write the Sprint 4 model plan: dataset, features, how `predict` is replaced (notes in `design.md`) | #11 | Thành | — | ~1 h |
| S3-17 | [Task] Follow `SETUP.md` on a clean machine (frontend included) and fill in "Tested by" | M3 docs | Thành | — | ~2 h |
| S3-18 | [Task] Set up the Vite + React app, router and the `/api` proxy | #9 | Hải | — | ~2 h |
| S3-19 | [Task] Write `api.js`: fetch wrapper, token handling, friendly error messages | #9 | Hải | — | ~2 h |
| S3-20 | [Task] Write the login state (`auth.jsx`), the route guard and the top bar with log out | #9 | Hải | — | ~2 h |
| S3-21 | [Task] Build the Login screen with error and loading states | #9 | Hải | — | ~2 h |
| S3-22 | [Task] Build the New application form with the error summary and a message under each wrong field | #10, #14 | Hải | — | ~3 h |
| S3-23 | [Task] Build the shared Loading, Error and Empty components and the global styles | #13 | Hải | — | ~2 h |
| S3-24 | [Task] Draw the Login and New application wireframes for `ui.md` section 2 | M3 docs | Hải | — | ~1 h |
| S3-25 | [Task] Update `README.md` (P0 stories table, test accounts) and `SETUP.md` (frontend steps, troubleshooting) | M3 docs | Hải | — | ~2 h |
| S3-26 | [Task] Build the Dashboard screen in its 4 states (empty, loading, error, data) | #13 | Huy | — | ~2 h |
| S3-27 | [Task] Build the Applications list screen | #11 | Huy | — | ~2 h |
| S3-28 | [Task] Build the Application details screen: data and the High risk banner | #11 | Huy | — | ~2 h |
| S3-29 | [Task] Show the score, label and reasons on the details screen, with "Score again" and the BR1, BR4, BR5 messages | #11 | Huy | — | ~3 h |
| S3-30 | [Task] Click through the 5 P0 stories against the real API, write down and fix integration bugs | M3 docs | Huy | — | ~3 h |
| S3-31 | [Task] Write `ui.md` section 1 (stories and status) and section 3 (error messages) | M3 docs | Huy | — | ~2 h |
| S3-32 | [Task] Draw the Dashboard (4 states) and Details wireframes, and write `ui.md` section 4 | M3 docs | Huy | — | ~2 h |
| S3-33 | [Task] Prepare `Team<NN>_M3.pdf`: cover block, 2 board screenshots, 2 app screenshots with the address bar | M3 docs | Huy | — | ~2 h |

#### Chores (no points, no time estimate)

| Ref | Issue title | Owner |
|-----|-------------|-------|
| S3-C1 | [Chore] Refine backlog for Sprint 3 | Trung (PO) |
| S3-C2 | [Chore] Sprint 3 wrap-up | Huy (SM) |
| S3-C3 | [Chore] Add PyJWT to `requirements.txt` and `JWT_SECRET` to `.env.example` | Trung |
| S3-C4 | [Chore] Add a frontend build job to `.github/workflows/ci.yml` | Hải |
| S3-C5 | [Chore] Ignore `node_modules/` and `frontend/dist/` in `.gitignore` | Hải |
| S3-C6 | [Chore] Update `traceability.md` and add images to `docs/images/ui/` once every task is done | Trung |

#### Totals

Proposed committed story points: **19** across five P0 stories. Confirm the actual commitment from the board; do not count the 33 child tasks again. Chores have no points. Completed and velocity must be filled from stories accepted and Done at review.

### Pull requests and cross-review

Title format `[#<issue>] <imperative summary>`, description with `Closes #<issue>` (one line per issue). Each PR is reviewed by someone who did not write it, using **Review changes** with at least one substantive comment. Every PR declares which AI tools were used and for what.

| Order | PR | Tasks | Author | Reviewer |
|-------|----|-------|--------|----------|
| 1 | Scoring module and service with unit tests | S3-11, S3-12, S3-13, S3-16 | Thành | Hải |
| 2 | Backend API: auth, applications, scoring and dashboard endpoints, seed, `design.md` and `changelog.md` | S3-01 to S3-10, S3-C3 | Trung | Thành |
| 3 | API tests for applications and scoring | S3-14, S3-15 | Thành | Trung |
| 4 | Frontend core, Login, New application, README, SETUP, CI job | S3-18 to S3-25, S3-C4, S3-C5 | Hải | Huy |
| 5 | Dashboard, list, details, `ui.md` | S3-26 to S3-29, S3-31, S3-32 | Huy | Trung |
| 6 | `SETUP.md` "Tested by" line | S3-17 | Thành | Hải |

Merge order is 1 to 6. All repository changes, including wrap-up and traceability, require a reviewed PR. PDF submission and GitHub-only actions do not themselves require code PRs. For S3-30: S3-30 fixes land in PR 5 or in a small `fix:` PR, S3-33 is the PDF itself.

### Result
_Fill in at the Sprint Review._

| Issue | Points | Status | If not done, why |
|-------|--------|--------|------------------|
| | | | |

**Completed: __ points. Velocity this sprint: __**

### Sprint Review
_To fill in: what we demonstrated (clean clone, one P0 story through the interface, one rule broken on purpose), feedback received._

### Retrospective
| Keep doing | Stop doing | Start doing |
|------------|------------|-------------|
| | | |

**Action for Sprint 4:** _one concrete action and one owner._

### Attendance
| Member | Planning | Review | Retro |
|--------|----------|--------|-------|
| Trung | | | |
| Thành | | | |
| Hải | | | |
| Huy | | | |


### Follow-up: Manager approval

Additional scope under US10 (#22), without claiming edit/cancel complete. Proposed tasks: S3-34 API and audit (Trung, ~2h), S3-35 Manager UI (Huy, ~2h), S3-36 approval tests (Thành, ~2h), S3-37 docs/browser evidence (Hải, ~1h). These are task-hour estimates, not Story Points. Confirm scope/commitment with the team; do not invent completed points or review outcomes.

### Follow-up: complete BR1–BR8

BR7/BR8 and concurrent BR5 enforcement added locally. Proposed tasks: S3-38 encryption/key/migration (Trung, ~3h), S3-39 protected lookup UI (Hải, ~2h), S3-40 employee API/session revocation (Trung, ~2h), S3-41 Employees UI (Huy, ~2h), S3-42 rule/privacy/account/concurrency tests (Thành, ~3h), S3-43 docs/browser evidence (Hải, ~1h). Actual issue numbers, team scope acceptance, reviewed merge and browser evidence remain pending. Hours are task estimates; do not add them to Story Points or invent completed velocity. See traceability.md for BR1–BR8 coverage. US06 history UI, US07 notifications and US10 edit/cancel remain separate pending stories.
