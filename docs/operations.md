# Operations

## 2. The CI pipeline

Latest verified green run on `main`: [42501981538](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/actions/runs/42501981538),
commit `fb2c3dc130e392f370298840ffc873b9d067927a`. All six checks succeeded;
run interval 16:51:11–16:54:08 UTC on 8 November 2026 (2m 57s).
An administrator must protect `main`: PR, another approval, required
**M5 release gate**, and no direct/force pushes. Save the actual settings screenshot
in `docs/images/operations/branch-protection.png`; no screenshot is fabricated here.

| Job | Checks |
|---|---|
| Backend | Install pinned dependencies; Ruff; pytest with coverage >=90%; migration and idempotent seed smoke |
| Frontend | npm ci; unit/render tests; production build; upload build artifact |
| PostgreSQL | Disposable PostgreSQL 16: schema, seed, create/edit, scoring/BR5, approval, reload persistence and logout |
| Browser | Install Chromium; run P0 and remaining role workflows on disposable data |
| Secrets | Scan tracked source; reject credentials and environment/database/bytecode files |
| Release gate | Fail unless every required job succeeded; Render deploys only after all checks pass |

## 3. Monitoring

The hourly monitor needs repository variable
`PUBLIC_APP_URL`; failures appear in Actions and repository notifications.
Huy checks failures daily and before the demo; this is not a 24-hour on-call service.
