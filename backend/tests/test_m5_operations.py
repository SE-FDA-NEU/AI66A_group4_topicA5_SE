"""S5-01 checks use isolated SQLite; PostgreSQL is exercised by the opt-in smoke script."""
from datetime import UTC, datetime
from types import SimpleNamespace

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.deployment import normalize_database_url, validate_production
from app.models import LoanApplication, User
from app.seed import seed_database


def production_settings(**overrides):
    values = {"APP_ENV": "production", "DATABASE_URL": "postgresql://localhost/demo?sslmode=require",
              "JWT_SECRET": "test-only-" * 8, "DATA_ENCRYPTION_KEY": Fernet.generate_key().decode()}
    return SimpleNamespace(**{**values, **overrides})


@pytest.mark.parametrize("url,expected", [
    ("postgres://user@host/db?sslmode=require", "postgresql+psycopg://user@host/db?sslmode=require"),
    ("postgresql://user@host/db", "postgresql+psycopg://user@host/db"),
    ("postgresql+psycopg://user@host/db", "postgresql+psycopg://user@host/db"),
    ("sqlite:///./demo.db", "sqlite:///./demo.db"),
])
def test_postgresql_url_selects_installed_driver_without_changing_other_urls(url, expected):
    assert normalize_database_url(url) == expected


@pytest.mark.parametrize("overrides", [
    {"DATABASE_URL": "sqlite:///ephemeral.db"},
    {"DATABASE_URL": "sensitive-sentinel"},
    {"JWT_SECRET": "dev-only-change-me"},
    {"JWT_SECRET": "x" * 31},
    {"DATA_ENCRYPTION_KEY": "sensitive-sentinel"},
    {"DATA_ENCRYPTION_KEY": "ký-tự-không-ascii"},
])
def test_production_refuses_unsafe_configuration_without_echoing_values(overrides):
    with pytest.raises(RuntimeError) as error:
        validate_production(production_settings(**overrides))
    assert "sensitive-sentinel" not in str(error.value)


def test_production_accepts_postgres_and_stable_keys_without_requiring_future_frontend_files():
    validate_production(production_settings())
    validate_production(SimpleNamespace(APP_ENV="development"))


def test_current_demo_is_idempotent_and_preserves_existing_accounts_and_changes(db_session, client, login):
    original_hash = "retained-existing-hash"
    user = User(email="linh@branch.vn", full_name="Retained name", hashed_password=original_hash,
                is_active=False, token_version=7)
    db_session.add(user)
    db_session.commit()
    assert seed_database(db_session, current_demo=True)["loan_applications"] == 12
    assert (user.full_name, user.hashed_password, user.is_active, user.token_version) == (
        "Retained name", original_hash, False, 7)
    headers = login("hoang@branch.vn")
    assert client.get("/api/dashboard/summary", headers=headers).json()["total_applications"] == 2
    assert sum(loan.created_at.date() == datetime.now(UTC).date()
               for loan in db_session.query(LoanApplication)) == 4
    loan = db_session.query(LoanApplication).first()
    loan.purpose = "Retained user change"
    db_session.commit()
    assert seed_database(db_session, current_demo=True) == {}
    assert db_session.get(LoanApplication, loan.id).purpose == "Retained user change"
    assert db_session.query(LoanApplication).count() == 12


@pytest.mark.parametrize("seed_enabled", [False, True])
def test_startup_seed_is_opt_in_and_preserves_records_after_restarting(tmp_path, monkeypatch, seed_enabled):
    from app import main

    engine = create_engine(f"sqlite:///{(tmp_path / 'startup.db').as_posix()}",
                           connect_args={"check_same_thread": False})
    factory = sessionmaker(bind=engine)
    monkeypatch.setattr(main, "engine", engine)
    monkeypatch.setattr(main, "SessionLocal", factory)
    monkeypatch.setattr(main, "get_settings", lambda: SimpleNamespace(APP_ENV="development", SEED_DEMO=seed_enabled))
    try:
        for _ in range(2):
            with TestClient(main.app):
                pass
        with factory() as db:
            assert db.query(LoanApplication).count() == (12 if seed_enabled else 0)
            assert db.query(User).count() == (3 if seed_enabled else 0)
    finally:
        engine.dispose()


def test_startup_rejects_invalid_production_before_migration_or_seeding(monkeypatch):
    from app import main

    monkeypatch.setattr(main, "get_settings", lambda: production_settings(DATABASE_URL="sqlite://", SEED_DEMO=True))
    monkeypatch.setattr(main, "ensure_schema", lambda *args: pytest.fail("Invalid production must not mutate schema"))
    with pytest.raises(RuntimeError, match="PostgreSQL"):
        with TestClient(main.app):
            pass
