"""S5-01 PostgreSQL migration/seed/persistence checks in a new isolated schema."""
import os
import sys
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path


def main():
    url = os.environ.get("M5_TEST_POSTGRES_URL")
    if not url:
        raise SystemExit("Set M5_TEST_POSTGRES_URL to a disposable PostgreSQL test database, never production.")
    # Do not read or write the checkout's .env or normal DATABASE_URL database.
    os.environ.update(DATABASE_URL=url, APP_ENV="development", SEED_DEMO="false")
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
    from sqlalchemy import create_engine, inspect, text
    from sqlalchemy.engine import make_url
    from sqlalchemy.orm import sessionmaker

    from app.deployment import normalize_database_url
    from app.migrate import ensure_schema
    from app.models import LoanApplication, User
    from app.seed import seed_database

    normalized = normalize_database_url(url)
    if make_url(normalized).get_backend_name() != "postgresql":
        raise SystemExit("M5_TEST_POSTGRES_URL must point to disposable PostgreSQL.")
    schema = "s501_test_" + uuid.uuid4().hex
    options = {"connect_timeout": 5, "options": f"-csearch_path={schema}"}
    admin = create_engine(normalized, hide_parameters=True)
    engine = None
    created = False
    try:
        with admin.begin() as conn:
            conn.execute(text(f'CREATE SCHEMA "{schema}"'))
        created = True
        engine = create_engine(normalized, hide_parameters=True, connect_args=options)
        # Simulate an old users table missing the additive migration columns.
        with engine.begin() as conn:
            conn.execute(text("CREATE TABLE users (id VARCHAR PRIMARY KEY, email VARCHAR UNIQUE NOT NULL, "
                              "full_name VARCHAR NOT NULL, hashed_password VARCHAR NOT NULL, "
                              "role VARCHAR(20) NOT NULL, failed_login_count INTEGER NOT NULL DEFAULT 0, "
                              "locked_until TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now())"))
            conn.execute(text("INSERT INTO users (id,email,full_name,hashed_password,role) "
                              "VALUES ('preserved','retained@example.invalid','Retained account','retained-hash','user')"))
        ensure_schema(engine)
        ensure_schema(engine)
        assert {"is_active", "token_version"} <= {c["name"] for c in inspect(engine).get_columns("users")}
        factory = sessionmaker(bind=engine)

        def seed_once(_):
            with factory() as db:
                return seed_database(db, current_demo=True)

        with ThreadPoolExecutor(max_workers=2) as pool:
            counts = list(pool.map(seed_once, range(2)))
        assert sum(bool(result) for result in counts) == 1, "Concurrent seed must insert once"
        with factory() as db:
            assert db.query(LoanApplication).count() == 12
            retained = db.get(User, "preserved")
            assert retained.hashed_password == "retained-hash" and retained.is_active
            db.query(LoanApplication).first().purpose = "Persistence sentinel"
            db.commit()
        engine.dispose()
        engine = create_engine(normalized, hide_parameters=True, connect_args=options)
        with sessionmaker(bind=engine)() as db:
            assert db.query(LoanApplication).filter_by(purpose="Persistence sentinel").count() == 1
            assert seed_database(db, current_demo=True) == {}
            assert db.query(User).count() == 4
            assert db.query(LoanApplication).count() == 12
        print("S5-01 PostgreSQL smoke passed: additive migration twice, concurrent seed once, retained users and reconnected persistence.")
    finally:
        if engine is not None:
            engine.dispose()
        if created:
            with admin.begin() as conn:
                # Identifier is generated here, never taken from an argument/user.
                conn.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        admin.dispose()


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # DBAPI exception text can contain hostnames or credentials. Keep it local/private.
        raise SystemExit("S5-01 PostgreSQL smoke failed; inspect the disposable server and configuration privately.") from None
