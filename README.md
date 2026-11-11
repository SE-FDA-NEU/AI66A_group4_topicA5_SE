https://credit-score-team04-03or.onrender.com

[![CI](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/actions/workflows/ci.yml?query=branch%3Amain)

# Credit Scoring Demo — Team 04

**Product Owner / Sprint 5 Scrum Master:** Đỗ Quang Trung (@macaronzz).
**Members:** Đỗ Quang Trung (@macaronzz), Trịnh Đức Thành (@Thanh-dev-192006),
Vũ Ngọc Hải (@HaiMeoden), Nguyễn Quang Huy (@criticalmatt-dot).

**Demo accounts only — shared test password: `Demo@2026`. Never use a real password.**

| Account | Role | Access |
|---|---|---|
| `hoang@branch.vn` | Officer | Own applications and daily metrics |
| `linh@branch.vn` | Officer | Own applications and daily metrics |
| `thanh@branch.vn` | Manager | Branch review, approval and Employees |

| P0 story | Start by clicking | Result |
|---|---|---|
| US01 Login | First page → sign in | Dashboard; lock/error guidance on invalid credentials |
| US08 Dashboard | My dashboard / Branch overview | Today's counts and average; Manager review queue |
| US03 Input application | New application → Submit and score | Saved Details appears before scoring completes |
| US09 Validation | New application → submit invalid income | Field message; invalid data is not saved |
| US04 Score and reasons | My/Branch applications → Open/Review | Stored score, reasons, CIC and history; reload retains them |

[Repository](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE) · [Project board](https://github.com/orgs/SE-FDA-NEU/projects/13/views/1) · [Setup](docs/SETUP.md) · [Operations](docs/operations.md)

## Release status

The latest recorded live health check returned `ok` on 2026-11-09, with
`X-App-Commit: fb2c3dc130e392f370298840ffc873b9d067927a`. That dated check recorded
reload and same-commit Render redeploy persistence ([deployment record](docs/deployment.md#public-deployment-verification--9-november-2026-vietnam)).
The current live health and deployed SHA could not be re-verified during the
2026-11-11 documentation audit; the endpoint timed out from the audit environment.

On 2026-11-11, [PR #265](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/265)
merged new public Incognito screenshots and physical-phone captures. They show
several real screens, but do not by themselves prove every P0 workflow, an
isolated HTTP 422/no-save case, or persistence after the current deployment.

Latest main CI: [run 43028281516](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/actions/runs/43028281516), commit `eee6938`,
all six jobs green in about **3 minutes**. The latest health-monitor run
[43028363826](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/actions/runs/43028363826)
was skipped by the previous workflow's `PUBLIC_APP_URL` gate. The monitor now
falls back to the URL in `docs/m5-release.json`; verify a successful run after
this change reaches `main`. The current live SHA still needs rechecking.

Still outstanding: verify current live health/SHA and align it with green main CI
before tagging `v1.0`; complete the isolated validation/no-save and history/reload
acceptance checks; rehearse rollback; capture branch-protection settings; add real
member IDs and review records; and configure/verify the public monitor. Release
metadata is in [m5-release.json](docs/m5-release.json).
## Run locally

Follow [SETUP](docs/SETUP.md), then open `http://localhost:5173`. Local development
uses the documented Vite/API servers and SQLite; production uses one Render origin
and hosted PostgreSQL. CI/Render use Python 3.12 and Node 22.
Preserve existing `.env`, database and encryption keys. See
[deployment and rollback](docs/deployment.md) before configuring hosting.

From the repository root, with backend dependencies installed:

```bash
python -m pytest -v
```

From `frontend/`:

```bash
npm ci
npm test
npm run build
npm run test:e2e
```

Browser installation and isolated test-server details are in [testing](docs/testing.md)
and [SETUP](docs/SETUP.md#p0-browser-regression-checks). Do not use a production DB for tests.

## Product and handoff

The app retains deterministic **`rules-v1`** scoring. Offline AI training and
model integration are outside the remaining release scope. Scores demonstrate an
educational workflow, not calibrated repayment probabilities or real lending decisions.
Scoring alone does not approve a loan; Manager confirmation records an assessment
decision and its actor/time. Disbursement is outside this app.

Details also supports scoring history, protected identifier lookup and unprocessed
application edit/cancel. Manager has Notifications and Employees. The server
enforces ownership, role rules and audit persistence.

- [Requirements](docs/requirements.md), [design](docs/design.md), [UI](docs/ui.md), [traceability](docs/traceability.md)
- [Changelog](docs/changelog.md), [Definition of Done](docs/definition-of-done.md), [sprint records](docs/sprint-log/)

Operational availability targets, monitoring and maintenance ownership are documented in [Operations](docs/operations.md).
