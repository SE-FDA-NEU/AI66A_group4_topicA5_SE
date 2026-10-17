"""The additive migration must upgrade a Sprint 2 database without data loss."""
from sqlalchemy import create_engine, inspect, text

from app.migrate import ensure_schema

# The loan_applications table as Sprint 2 shipped it: no BR7 columns.
OLD_SCHEMA = """
CREATE TABLE users (
    id VARCHAR PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    hashed_password VARCHAR NOT NULL,
    full_name VARCHAR NOT NULL,
    role VARCHAR(20) NOT NULL,
    failed_login_count INTEGER NOT NULL DEFAULT 0,
    locked_until DATETIME,
    created_at DATETIME NOT NULL
);
CREATE TABLE loan_applications (
    id VARCHAR PRIMARY KEY,
    created_by VARCHAR NOT NULL REFERENCES users(id),
    monthly_income BIGINT NOT NULL,
    loan_amount BIGINT NOT NULL,
    loan_term_months INTEGER NOT NULL,
    estimated_monthly_payment BIGINT NOT NULL,
    credit_history_note TEXT,
    purpose VARCHAR,
    cic_debt_group INTEGER,
    status VARCHAR(20) NOT NULL,
    dsr_flag_high_risk BOOLEAN NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);
INSERT INTO users VALUES
    ('u1', 'old@branch.vn', '!', 'Old Officer', 'user', 0, NULL, '2026-10-01 00:00:00');
INSERT INTO loan_applications VALUES
    ('l1', 'u1', 15000000, 100000000, 24, 4500000, '3 years', 'Motorbike',
     1, 'pending', 0, '2026-10-01 00:00:00', '2026-10-01 00:00:00');
"""

NEW_COLUMNS = {
    "citizen_id_encrypted", "citizen_id_last4",
    "bank_account_encrypted", "bank_account_last4",
}


def _old_database(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'old.db'}")
    with engine.begin() as connection:
        for statement in filter(str.strip, OLD_SCHEMA.split(";")):
            connection.execute(text(statement))
    return engine


def test_migration_adds_the_br7_columns_and_keeps_existing_rows(tmp_path):
    engine = _old_database(tmp_path)
    columns = {c["name"] for c in inspect(engine).get_columns("loan_applications")}
    assert not (NEW_COLUMNS & columns), "precondition: the old database has no BR7 columns"

    ensure_schema(engine)

    columns = {c["name"] for c in inspect(engine).get_columns("loan_applications")}
    assert NEW_COLUMNS <= columns
    with engine.begin() as connection:
        row = connection.execute(text(
            "SELECT purpose, monthly_income, citizen_id_encrypted, citizen_id_last4"
            " FROM loan_applications WHERE id = 'l1'"
        )).one()
    # Old data intact; the new columns read as "no identifier provided".
    assert row[0] == "Motorbike" and row[1] == 15000000
    assert row[2] is None and row[3] is None
    # Sprint 3's users columns are still added in the same pass.
    user_columns = {c["name"] for c in inspect(engine).get_columns("users")}
    assert {"is_active", "token_version"} <= user_columns


def test_migration_is_idempotent(tmp_path):
    engine = _old_database(tmp_path)
    ensure_schema(engine)
    ensure_schema(engine)  # must not fail with "duplicate column name"
    with engine.begin() as connection:
        assert connection.execute(
            text("SELECT count(*) FROM loan_applications")
        ).scalar() == 1


def test_migration_creates_the_tables_sprint_2_never_had(tmp_path):
    engine = _old_database(tmp_path)
    ensure_schema(engine)
    tables = set(inspect(engine).get_table_names())
    assert {"scoring_results", "event_logs"} <= tables
