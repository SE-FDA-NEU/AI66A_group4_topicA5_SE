# Operations

## 1. How to run and release

Public HTTPS URL: [https://credit-score-team04-03or.onrender.com](https://credit-score-team04-03or.onrender.com). Platform: Render Web Service plus Render Free PostgreSQL in Oregon. [Deployment](deployment.md) gives exact commands, environment settings
and encrypted backup/restore instructions. Use synthetic demo accounts from README.
Keep app/DB online through 2026-11-30 and until grades are published.

Release: reviewed PR → `main` → green **M5 release gate** → Render **After CI Checks
Pass** → `/health`, P0 and persistence checks. Record the live SHA, then tag that
commit `v1.0`. Deployment/redeploy persistence is recorded; rollback, private/physical-phone acceptance and v1.0 remain pending.

Rollback: choose the last successful Render deploy. Confirm database/schema and
encryption-key compatibility first; app rollback does not restore database data.
For the durable correction, revert the faulty change through a reviewed PR and
let CI deploy it. Dashboard rollback disables auto-deploy; re-enable **After CI
Checks Pass** after the correction is green. [Render rollback](https://render.com/docs/rollbacks).

## 2. The CI pipeline

Verified [green main run](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/actions/runs/42505446604): `cd273ab`, 2026-11-09, about **2m 55s** elapsed.
Jobs run partly in parallel. Live health is good at `fb2c3dc`; main CI is for `cd273ab`. Align them before v1.0 and refresh after merge.

| Job | What it checks | Observed duration |
|---|---|---|
| Backend | Pinned install, Ruff, pytest coverage >=90%, migration and repeated seed | 95s |
| Frontend | npm ci, unit/render tests, build and artifact | 11s |
| PostgreSQL | Disposable PG16: legacy migration, concurrent seed, health, create/edit, BR5, approval, persistence, logout | 39s |
| Browser | Chromium; isolated API/Vite P0 and role flows; production SPA is checked separately by backend tests | 72s |
| Secrets | Tracked credentials and forbidden runtime files | 6s |
| M5 release gate | Every required job must report success | 3s |

`main` reports protected via GitHub, but exact required checks/approval rules and
the settings screenshot are **unverified**. An administrator must confirm PR,
another approval, **M5 release gate**, up-to-date checks and no direct/force pushes.
Save the real screenshot as `images/operations/branch-protection.png`. CODEOWNERS
does not enable protection. [Deploy-after-checks](https://render.com/docs/deploys#automatic-deploys).

## 3. Monitoring

Read production stdout in Render service **Logs**, and deploy failures in
**Events/Deploys**. Structured `credit.requests` records include method, route
template, status, duration_ms and request_id; they exclude body, raw query,
credentials and personal identifiers. Production starts with Uvicorn access logs off.

`/health` queries the users table: 200 `ok` for working DB/schema, 503 `unavailable`
on SQL errors, with no-store. `X-App-Commit` identifies the deployment when configured.
Run `scripts/check_live.py` against the actual URL. The hourly Actions monitor needs
`PUBLIC_APP_URL`; its latest observed scheduled run was skipped, so active monitoring
is not yet established.

| Signal | Proposed alert | Response / owner |
|---|---|---|
| Error rate | 5xx / all requests >1% over 15 min | Huy checks health/deploy logs; Thành reproduces regressions |
| Response time | p95 duration >2000 ms over 15 min, >=20 requests | Huy separates cold start from sustained delay; inspect DB/network |

Export safe JSON logs to compute those values; no dashboard/metrics aggregator is
claimed. Huy reviews daily, after deploy and before inspection; investigate failed
health promptly. [Evidence checklist](images/operations/README.md).

## 4. Known risks and technical debt

| Item | Layer | What could happen | Plan |
|---|---|---|---|
| Rules-based score | Code | A demo score is mistaken for a lending prediction | Accepted: rules-v1 demonstrates workflow only; no real credit decisions. |
| Hosting idle/quota/expiry | Infrastructure | Public URL is slow or unavailable | #250: the recorded Free DB expires 2026-12-09 00:07 Vietnam; upgrade/retain data before expiry if grading continues. |
| Lost encryption keys | Data | Identifiers or backups become unreadable | Accepted: Trung retains separate keys and rehearses restore on disposable DB. |
| Migration rollback | Data | Old app cannot read a newer schema | Accepted: additive changes, pre-release backup and compatibility check before rollback. |
| Missing live evidence | Tests | Green CI misses hosted persistence/mobile problems | #245: finish private/physical-phone and address-bar-visible evidence; existing public/redeploy checks do not cover those. |
| Missing release proof | Docs | URL/tag/CI SHA or submission data disagree | #243: verified metadata/export gate; keep unknown fields null. |

## 5. Maintenance plan

| Area | What to do | Owner | How often |
|---|---|---|---|
| Bugs | Reproduce, add regression, review and deploy green | Thành | On report; triage daily |
| Dependencies | Review advisories, update pins/lockfiles, run full CI | Hải | Weekly and on advisory |
| Data backups | Encrypted pg_dump, separate keys, disposable restore | Trung | Daily/before release; restore weekly |
| Monitoring | Health, 5xx rate, p95, quota/expiry, monitor failures | Huy | Daily/after deploy/before demo |
| Documentation | Keep URL, accounts, contracts, evidence and release SHA accurate | Trung | Every release and weekly |

## 6. Lessons learned

1. Saving and scoring shared one wait, hiding a saved application. Details now
opens before scoring; next time, design saved/loading/error states first.
2. Dependent files reached branches separately and broke imports/contracts.
Handoffs now include dependency order and regressions; next time, test complete PR scope.
3. Credential scanning mistook password-error text for a secret. Message constants
were separated and the scanner improved; next time, check both safe and secret-shaped fixtures.
