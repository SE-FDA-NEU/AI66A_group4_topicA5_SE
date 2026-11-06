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
