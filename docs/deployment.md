# S5-01 — PostgreSQL, demo seed and encrypted backup

This is the database foundation for deployment. Hosting, SPA serving, the release
gate and database-aware `/health` are delivered by their respective M5 tasks.
The application still defaults to local SQLite for development.

## PostgreSQL configuration

Install `backend/requirements.txt`; it includes `psycopg[binary]==3.2.3`.
Set the following in your hosting platform's environment settings:

| Variable | Value / behavior |
|---|---|
| `APP_ENV` | `production` enables the database/secret startup checks |
| `DATABASE_URL` | The hosted PostgreSQL connection URL with `sslmode=require`; never commit it |
| `JWT_SECRET` | Random value of at least 32 characters; retain it across restarts |
| `DATA_ENCRYPTION_KEY` | Valid persistent Fernet key; preserve the existing key when reusing encrypted records |
| `SEED_DEMO` | Default `false`; opt in with `true` for this synthetic demonstration |

`postgres://` and `postgresql://` URLs are normalized to
`postgresql+psycopg://`, preserving credentials and query parameters. Explicit
driver URLs remain unchanged. Connections use pre-ping, hidden SQL parameters
and a five-second PostgreSQL connection timeout. Use a hosted database whose
storage survives service deployments; a PostgreSQL hostname alone does not
prove the provider's retention policy or backup coverage.

Production startup rejects SQLite, a short/default JWT secret or an invalid
identifier-encryption key before migration/seeding. These checks do not generate
or replace secrets. Do not run `init_secrets` against an existing hosted database
to repair an unknown encryption key.

## Schema and repeatable demo data

From `backend/`, with the intended database environment configured:

```bash
python -m app.migrate
python -m app.seed --current-demo
```

Startup also runs the additive migration. `SEED_DEMO=true` then calls the same
seed with `current_demo=True`: four synthetic applications are dated today, two
per Officer, so the first dashboard is populated. Without that option, the seed
retains the historical-date fixture used by existing tests. Test accounts and
passwords are listed in [SETUP.md](SETUP.md#5-create-and-seed-the-database).

When any application exists, seed returns without changing records. Existing
users are reused, retaining names, password hashes, roles, active state and token
versions. PostgreSQL seed calls take a transaction-scoped advisory lock to avoid
duplicate inserts when two startup workers seed concurrently. This lock covers
seeding, not concurrent schema migrations; run one migration/release operation
before scaling workers.

## Isolated PostgreSQL smoke

Use a **disposable test database**, never the hosted production database. Set
`M5_TEST_POSTGRES_URL` privately in your terminal environment, then from the
repository root run:

```bash
python scripts/postgres_smoke.py
```

The command requires schema creation/removal rights, generates its own schema,
migrates a legacy users table twice, concurrently seeds once, preserves existing
accounts and checks persistence after disposing/reopening the connection pool.
Only that generated test schema is removed. It does not read the checkout's
`.env`, use its normal `DATABASE_URL`, or replace local keys. Reconnection is a
database persistence check; it is not proof of a hosted service restart.

## Encrypted backup

Install the PostgreSQL client tools; `pg_dump` must be compatible with the server
version. Set `PG_DUMP_PATH` if it is not on PATH. In a trusted terminal, provide
`DATABASE_URL` and a separate Fernet `BACKUP_ENCRYPTION_KEY` through environment
settings or your secret manager. The script does not load `.env` automatically.
Keep both the backup key and the original `DATA_ENCRYPTION_KEY` securely: decrypting
the dump does not replace the key protecting identifiers inside its records.

From the repository root, using the backend Python environment:

```bash
python scripts/backup_database.py backups/demo-YYYYMMDD.dump.fernet
python scripts/backup_database.py backups/demo-YYYYMMDD.dump.fernet --verify
```

Choose a new timestamped filename each time; existing output is never overwritten.
Credentials are supplied to `pg_dump` through its child environment, not command
arguments. The custom-format dump is encrypted in memory and only ciphertext is
written. Verification decrypts in memory and checks the archive signature; a full
restore test is still necessary. Use a trusted backup runner because environment
variables can be visible to other processes on some systems. This small-demo
command holds the dump in memory; review memory limits before larger datasets.

## Restore rehearsal — disposable target only

Create a new empty test database named `s501_restore_check` using your PostgreSQL
administration tool. Set `S5_RESTORE_TEST_URL` to **that database**, retaining
`BACKUP_ENCRYPTION_KEY` for the archive. Save/run the following Python snippet
from the repository root (for example in ignored `tmp/restore_check.py`, using
`python -m tmp.restore_check`). It rejects ordinary database names and sends the
decrypted archive directly to `pg_restore`, without a plaintext dump file.

```python
import os
import subprocess
from pathlib import Path
from sqlalchemy.engine import make_url
from scripts.backup_database import _connection_env, verify_backup

target_url = os.environ["S5_RESTORE_TEST_URL"]
target = make_url(target_url)
if not target.database or not target.database.startswith("s501_restore_"):
    raise SystemExit("Use a new disposable s501_restore_ database only.")
data = verify_backup(Path("backups/demo-YYYYMMDD.dump.fernet"),
                     os.environ["BACKUP_ENCRYPTION_KEY"])
result = subprocess.run([os.environ.get("PG_RESTORE_PATH", "pg_restore"),
                         "--dbname", target.database, "--no-owner", "--no-acl",
                         "--no-password", "--exit-on-error"],
                        input=data, env=_connection_env(target_url), capture_output=True)
if result.returncode:
    raise SystemExit("Test restore failed; inspect the disposable target privately.")
print("Test archive restored; verify accounts, loans and encrypted identifiers in the test DB.")
```

Check row counts, sample loan values and retained users. To open encrypted
identifiers in a test instance, supply the matching original data-encryption key
securely. Do not point the app or this rehearsal at a production restore target.
After a successful rehearsal, retain the encrypted backup and keys separately.

## Local S5-01 verification

On 2026-11-06, the proposed S5-01 source passed **576 backend tests**, with
**95.32% application coverage**, and the backend/scripts Ruff checks. A disposable
loopback PostgreSQL **16.15** cluster passed additive legacy migration twice,
concurrent seed-once, a real server restart, encrypted backup verification and
restore into a new test database. Retained account hashes, loan values and a
synthetic encrypted identifier were checked after restore. The temporary server
was stopped. These local results do not establish hosted deployment or GitHub CI.

References: [SQLAlchemy psycopg dialect](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#module-sqlalchemy.dialects.postgresql.psycopg),
[PostgreSQL pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html),
[PostgreSQL connection environment variables](https://www.postgresql.org/docs/16/libpq-envars.html).

## Deploy the existing Render and PostgreSQL accounts

1. An administrator protects `main`: require PRs, at least one other approval,
   dismiss stale approvals, require **M5 release gate**, require up-to-date checks,
   and disallow direct/force pushes. Preserve the real settings screenshot as
   `docs/images/operations/branch-protection.png`.
2. In Render, create a Blueprint from the repository's `render.yaml` on `main`,
   or a Python Web Service with exactly the commands/environment in that file.
   Use **After CI Checks Pass** (`autoDeployTrigger: checksPass`). The build runs
   `bash scripts/render-build.sh`; start runs `cd backend && python -m app.start`;
   Health Check Path is `/health`. Root Directory stays the repository root.
3. Create or reuse the hosted Render PostgreSQL database named
   `credit-score-team04-db` in Oregon. The Blueprint sets `DATABASE_URL` from
   its `connectionString`; no connection password belongs in Git. The database
   and web service must share the region. A laptop's `localhost` database is not
   reachable from Render. Common `postgres://` and `postgresql://` URLs normalize
   to psycopg 3. For a different hosted provider, configure its connection URL
   privately in Render with TLS (`sslmode=require`).
4. For a new service, Render generates `JWT_SECRET` and `DATA_ENCRYPTION_KEY`
   once. The generated encryption key is a base64-encoded 256-bit value accepted
   by Fernet. Keep both values stable across deployments and retain a secure
   backup. When reusing an encrypted database, preserve its matching original
   encryption key; do not regenerate it or run `init_secrets` on every deploy.
5. `APP_ENV=production`, `STATIC_DIR=../frontend/dist`, `SEED_DEMO=true` and
   the Node/Python versions come from the Blueprint. Startup adds schema and
   seeds a truly empty demo DB once. Do not connect this public demo to a real
   financial/customer database. Reusing a populated DB does not reset passwords.
6. Wait for green CI and a successful deploy. Record Render's actual HTTPS URL;
   the frontend uses relative `/api` requests to that same origin. No localhost
   URL, CORS wildcard or second frontend hosting service is needed.
7. In a private browser window on laptop and phone, log in with both roles and
   complete every P0 by clicking. Create and score, reload, and verify the same
   record; submit income 0 and verify 422/message/no record created. Restart or
   redeploy the service and verify the created record still exists in Postgres.
8. Run `python scripts/check_live.py --url https://ACTUAL-URL` and compare
    `X-App-Commit` with the green CI head SHA. Then set GitHub repository variable
    `PUBLIC_APP_URL` for the hourly `monitor.yml`. Review failed-run notifications.
9. Record URL, deployment SHA, green-main CI run and actual branch screenshot in
    `docs/m5-release.json`; put the URL as the first line of README. Add member
    student IDs. Replace only verified pending fields, never a guessed service URL.

## Public deployment verification — 9 November 2026 (Vietnam)

| Item | Actual result |
|---|---|
| Public HTTPS app | [credit-score-team04-03or.onrender.com](https://credit-score-team04-03or.onrender.com) |
| Application commit | `fb2c3dc130e392f370298840ffc873b9d067927a` on `main`; confirmed by `X-App-Commit` |
| Required CI | [Run 42501981538](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/actions/runs/42501981538): all six checks succeeded; run interval 16:51:11–16:54:08 UTC (2m 57s) |
| Render service | [credit-score-team04-03or](https://dashboard.render.com/web/srv-dboaqu3rjlhs73at8pfg), Free, Oregon, `checksPass`, `/health` |
| Initial deploy | `dep-dboaqubrjlhs73at8qu0`: live |
| Persistence redeploy | `dep-dboatejrjlhs73atg470`: live, same application commit |
| Health after redeploy | HTTPS 200, `status: ok`, matching `X-App-Commit` |
| Saved synthetic record | `79115c20-7fc7-434e-9144-c062923e8341`: score 95, one `rules-v1` history entry remained after reload and redeploy |
| Stable secrets | Existing browser session remained valid; synthetic encrypted identifiers could still be revealed after redeploy |
| PostgreSQL | `credit-score-team04-db`, Free PostgreSQL 16 in Oregon; expires **9 December 2026, 00:07 Vietnam time** |
| Blueprint configuration | [credit-score-team04](https://dashboard.render.com/blueprint/exs-dboao5mc6qcc73d4fdj0), currently reads `250-configure-render`; application code still deploys from `main` |

The browser check signed in as the synthetic Officer, submitted income 0 and
observed the field error, then saved/scored valid input. Reload and a separately
approved same-commit Render redeploy preserved the record, score and identifiers.
No database external-access rule was opened for verification.

Actual page captures: [saved data](images/operations/live-p0-data.jpg),
[business-rule error](images/operations/live-br-error.jpg),
[history after redeploy](images/operations/restart-persistence.jpg),
[masked data after redeploy](images/operations/live-after-redeploy.jpg) and
[390×844 mobile-width viewport](images/operations/mobile-p0.jpg).
These are page-only captures; the mobile viewport is not a physical-phone test.

Still pending: rollback rehearsal, physical-phone/private-window acceptance,
actual branch-protection evidence and setting/verifying GitHub `PUBLIC_APP_URL`.
The Blueprint configuration follow-up needs review/merge before pointing the
Blueprint back to `main`. No release tag was created. The Free database expiry
must be addressed if grading continues beyond 9 December 2026.

## Backup and rollback

Normal rollback is a reviewed `git revert` followed by green CI and deployment.
For an outage, Render Rollback can restore a previous healthy build; pause auto
deploy until Git is reconciled, then restore **After CI Checks Pass**. Keep both
JWT and data keys; code rollback does not reverse database schema/data changes.

- [Render FastAPI start command](https://render.com/docs/deploy-fastapi)
- [Blueprint fields and checksPass](https://render.com/docs/blueprint-spec)
- [Free service storage, sleep and database expiry](https://render.com/docs/free)
- [SQLAlchemy psycopg dialect](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#module-sqlalchemy.dialects.postgresql.psycopg)

Render free web-service files are ephemeral and free Render Postgres expires
after 30 days. Confirm the existing database's provider/expiry and choose a plan
that actually lasts through grading. No paid plan has been purchased by this work.
