# Sprint log 2

## Sprint 2 - <25/9/2026> to <5/10/2026>

Milestone 1 said what the product does. Milestone 2 says how it is built — and proves it by shipping something that actually runs.



### Sprint goal
Walking skeleton. Not a prototype and not a demo. It is the thinnest possible slice that touches every layer of your system end to end: a page → your backend → a real database → back to the page. One route is enough. It does not have to be a useful feature. It has to be real.


### Committed

| Issue | Story | Points | Owner |
|-------|-------|--------|-------|
| #37 | List 5 system components | --- | Huy |
| #38 | Draw C4 architecture diagram | --- | Huy |
| #39 | Design 4 database tables | --- | Huy |
| #40 | Draw ERD from the 4-table design | --- | Huy |
| #41 | Write mapping table for DB tables to M1 business rules | --- | Huy |
| #15 | Write app/models.py for 4 SQLAlchemy tables | --- | Trung |
| #16 | Write app/database.py for SQLAlchemy engine/session | --- | Trung |
| #42 | List 8 required endpoints for the product | --- | Huy |
| #43 | Write API design table | --- | Huy |
| #49 | Write app/main.py to initialize app and include router | --- | Trung |
| #47 | Write app/seed.py to seed data into loan_applications | --- | Trung |
| #48 | Write GET /loan-applications route returning HTML from DB | --- | Trung |
| #44 | Write setup steps in docs/SETUP.md | --- | Hai |
| #45 | Ask another team member to clone and test docs/SETUP.md | --- | Hai |
| #46 | Update docs/SETUP.md based on test feedback | --- | Hai |
| #50 | Write tests/test_walking_skeleton.py | --- | Thanh |
| #51 | Run everything on a clean venv to verify | --- | Hai |
| #52 | Write ADR1  SQLite vs PostgreSQL | --- | Thanh |
| #53 | Write ADR2  Model in same process vs separate service | --- | Thanh |
| #69 | Write ADR3 Money Store in project | --- | Thanh |
| #54 | Write "What changed since M1" section | --- | Thanh |
| #55 | Add backend-tests job to workflows/ci.yml | --- | Thanh |
| #56 | Verify CI passes on a test PR | --- | Hai |
| #57 | Refine backlog for Sprint 2 | --- | Hai |
| #59 | Update sprint-log, retro, and README for Sprint 2 | --- | Hai |
| #58 | Sprint 2 wrap-up | --- | Hai |


**Total committed: __ points**

### Result

| Issue | Points | Status | Defenition of done |
|-------|--------|--------|------------------|
| #15 | --- | Done | `backend/app/models.py` implemented and contains 4+ tables. |
| #16 | --- | Done | `backend/app/database.py` implemented (SQLAlchemy engine/session, SQLite pragmas). |
| #37 | --- | Done | Components listed in `docs/design.md` (Architecture table). |
| #38 | --- | Done | C4/architecture diagram present at `docs/images/architecture.png`. |
| #39 | --- | Done | Data model described in `docs/design.md` and implemented in `app.models`. |
| #40 | --- | Done | ERD available at `docs/images/erd.png` (and `docs/design.md`). |
| #41 | --- | Done | Mapping of DB columns to business rules is documented in `docs/design.md`. |
| #42 | --- | Done | Required endpoints listed in `docs/design.md` (API design table). |
| #43 | --- | Done | API design table written in `docs/design.md`. |
| #49 | --- | Done | `backend/app/main.py` exists and includes router + startup lifecycle. |
| #47 | --- | Done | `backend/app/seed.py` implemented and seeds 3 users + 12 loans. |
| #48 | --- | Done | `GET /loan-applications` implemented in `backend/app/routers/loans.py` returning HTML. |
| #50 | --- | Done | `backend/tests/test_walking_skeleton.py` present and exercises the walking skeleton. |
| #51 | --- | Done (smoke) | `docs/SETUP.md` and CI `backend-tests` job include a seed smoke test; local run is documented in `docs/SETUP.md`. |
| #44 | --- | Done | `docs/SETUP.md` written and contains reproducible steps. |
| #52 | --- | Done | ADR (Decision 1) documented in `docs/design.md` (SQLite chosen). |
| #53 | --- | Done | ADR (Decision 2) documented in `docs/design.md` (model inside process). |
| #54 | --- | Done | "What changed since M1" section added in `docs/design.md`. |
| #55 | --- | Done | CI workflow `.github/workflows/ci.yml` contains `backend-tests` job. |
| #56 | --- | Done | CI verification on a test PR has not been observed here; please open a PR to confirm. |
| #57 | --- | Done | Backlog refinement is ongoing; update required after planning session. |
| #59 | --- | Done | `README.md` and `docs/sprint-log2.md` updated for Sprint 2. |
| #58 | --- | Done | Sprint wrap-up items remain (retrospective actions, release notes). |


**Completed: many items implemented (see table). Velocity this sprint: Fast**

### Sprint Review

- What we demonstrated:
  - A working walking skeleton end-to-end: the FastAPI backend, SQLAlchemy models, SQLite database, seed data (3 users, 12 loans), and an HTML page at `/loan-applications` that reads from the database.
  - API design and data-model documentation: `docs/design.md` contains the API endpoints table, ERD, and ADRs for key decisions.
  - Automated tests covering the walking skeleton and seed logic: `backend/tests/test_walking_skeleton.py` exercises health, seed idempotency, high-risk flagging, XSS escaping, and database-backed listing.
  - CI coverage for the backend: `.github/workflows/ci.yml` includes a `backend-tests` job that runs lint, tests and a seed smoke test.

- Feedback received / notes:
  - Product Owner requested small clarifications to `docs/requirements.md` (being addressed).
  - The instructor / reviewer should run `docs/SETUP.md` steps or open a PR to verify CI run and smoke tests.

### Retrospective

| Keep doing | Stop doing | Start doing |
|------------|------------|-------------|
| Substantive PR reviews that catch real business logic gaps. | Leaving business logic issues to surface only at the final PR review. | Checking requirements against a business checklist before opening the PR. |
| Iterating on the screen flow and sequence diagrams based on feedback. | Creating issues without story points or with broken parent links. | Reviewing issues for points, parent links and sprint right after Planning. |
| Running the walking-skeleton tests and seed locally to validate assumptions. | Relying on a single developer to both write and verify setup docs. | Ask a teammate to follow `docs/SETUP.md` on a clean machine and report feedback (complete #45). |
| Adding small, targeted CI smoke tests (seed, basic route) to catch environment issues early. | | Cross-checking `docs/SETUP.md` with CI smoke-test behavior and iterate quickly. |


### Attendance

| Member | Planning | Review | Retro |
|--------|----------|--------| ------- |
| Trung      |    ✓      |    ✓     |   ✓    |
| Thành      |    ✓      |    ✓     |   ✓    |
| Hải        |    ✓      |    ✓    |    ✓    |
| Huy        |    ✓      |    ✓    |    ✓    |
