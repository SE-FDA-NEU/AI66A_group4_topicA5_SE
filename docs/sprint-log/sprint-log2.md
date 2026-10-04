# Sprint log 2

## Sprint 2 - <25/9/2026> to <5/10/2026>

Milestone 1 said what the product does. Milestone 2 says how it is built — and proves it by shipping something that actually runs.



### Sprint goal
Walking skeleton. Not a prototype and not a demo. It is the thinnest possible slice that touches every layer of your system end to end: a page → your backend → a real database → back to the page. One route is enough. It does not have to be a useful feature. It has to be real.


### Committed

| Issue | Story | Points | Owner |
|-------|-------|--------|-------|
| #37 | List 5 system components | --- | Trung |
| #38 | Draw C4 architecture diagram | --- | Huy |
| #39 | Design 4 database tables | --- | Huy |
| #40 | Draw ERD from the 4-table design | --- | Huy |
| #41 | Write mapping table for DB tables to M1 business rules | --- | Huy |
| #15 | Write app/models.py for 4 SQLAlchemy tables | 2 | Trung |
| #16 | Write app/database.py for SQLAlchemy engine/session | 1 | Trung |
| #42 | List 8 required endpoints for the product | --- | Huy |
| #43 | Write API design table | --- | Huy |
| #49 | Write app/main.py to initialize app and include router | 1 | Trung |
| #47 | Write app/seed.py to seed data into loan_applications | 1 | Trung |
| #48 | Write GET /loan-applications route returning HTML from DB | 3 | Trung |
| #44 | Write setup steps in docs/SETUP.md | --- | Hai |
| #45 | Ask another team member to clone and test docs/SETUP.md | --- | Hai |
| #46 | Update docs/SETUP.md based on test feedback | --- | Hai |
| #70 | Write walking-skeleton into design.md | --- | Hai |
| #50 | Write tests/test_walking_skeleton.py | 1 | Thanh |
| #51 | Run everything on a clean venv to verify | 1 | Hai |
| #52 | Write ADR1  SQLite vs PostgreSQL | --- | Thanh |
| #53 | Write ADR2  Model in same process vs separate service | --- | Thanh |
| #69 | Write ADR3 Money Store in project | --- | Thanh |
| #54 | Write "What changed since M1" section | --- | Thanh |
| #55 | Add backend-tests job to workflows/ci.yml | --- | Thanh |
| #56 | Update README for Sprint 2 | --- | Hai |
| #57 | Refine backlog for Sprint 2 | --- | Trung |
| #59 | Update sprint-log, retro, and README for Sprint 2 | --- | Hai |
| #85 | Fix bug HTTP 404 | --- | Hai |
| #89 | Add information for walking-skeleton in design.md | --- | Trung |
| #58 | Sprint 2 wrap-up | --- | Hai |


**Total committed: 10 points**

### Result

| Issue | Points | Status | If not done, why? |
|-------|--------|--------|------------------|
| #15 | 2 | Done | --- |
| #16 | 1 | Done | --- |
| #37 | --- | Done | --- |
| #38 | --- | Done | --- |
| #39 | --- | Done | --- |
| #40 | --- | Done | --- |
| #41 | --- | Done | --- |
| #42 | --- | Done | --- |
| #43 | --- | Done | --- |
| #49 | 1 | Done | --- |
| #47 | 1 | Done | --- |
| #48 | 3 | Done | --- |
| #50 | 1 | Done | --- |
| #51 | 1 | Done | --- |
| #44 | --- | Done | --- |
| #45 | --- | Done | --- |
| #46 | --- | Done | --- |
| #52 | --- | Done | --- |
| #53 | --- | Done | --- |
| #54 | --- | Done | --- |
| #55 | --- | Done | --- |
| #56 | --- | Done | --- |
| #57 | --- | Done | --- |
| #59 | --- | Done | --- |
| #58 | --- | Done | --- |
| #69 | --- | Done | --- |
| #70 | --- | Done | --- |
| #89 | --- | Done | --- |
| #85 | --- | Done | --- |



**Completed: many items implemented (see table). Velocity this sprint: Fast**

### Sprint Review

- What we demonstrated:
  - A working walking skeleton: FastAPI backend, SQLAlchemy models, SQLite database, 12 seeded loan applications (3 users), and an HTML page at `/loan-applications` that reads them from the database.
  - Design documentation in `docs/design.md`: architecture diagram, ERD with a column-to-rule mapping, API design table, and three ADRs, each with options and a condition that would change the decision.
  - Automated tests: 21 tests pass (`backend/tests/test_models.py`, `backend/tests/test_walking_skeleton.py`), including seed idempotency, BR3 high-risk flagging and HTML escaping.
  - CI: the `backend-tests` job runs lint, the tests and a seed smoke test.

### Retrospective

| Keep doing | Stop doing | Start doing |
|------------|------------|-------------|
| Substantive PR reviews that catch real business-logic gaps. | Leaving business-logic issues to surface only at the final PR review. | Checking requirements against a business checklist before opening the PR. |
| Iterating on the screen flow and sequence diagrams based on feedback. | Creating issues without story points or with broken parent links. | Reviewing issues for points, parent links and sprint right after Planning. |
| Running the walking-skeleton tests and the seed locally to validate assumptions. | Relying on one person to both write and verify the setup docs. | Having someone outside the author follow `docs/SETUP.md` on a clean machine before the milestone is closed. |
| Adding small, targeted CI smoke tests (seed, basic route) to catch environment issues early. | Marking an issue Done when its own notes say work remains. | Updating this log, `traceability.md` and the README in the same PR as the code change. |


### Attendance

| Member | Planning | Review | Retro |
|--------|----------|--------| ------- |
| Trung      |    ✓      |    ✓     |   ✓    |
| Thành      |    ✓      |    ✓     |   ✓    |
| Hải        |    ✓      |    ✓    |    ✓    |
| Huy        |    ✓      |    ✓    |    ✓    |
