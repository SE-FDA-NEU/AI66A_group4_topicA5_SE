import os

os.environ["DATABASE_URL"] = "sqlite://"
from cryptography.fernet import Fernet

os.environ['DATA_ENCRYPTION_KEY'] = Fernet.generate_key().decode("ascii")


import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


@pytest.fixture
def db_session():
    """A fresh, empty in-memory database for every test (full isolation)."""
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine, autoflush=False, autocommit=False)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def client(db_session):
    """A test client whose routes read from the test database."""

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def seeded(db_session):
    from app.seed import seed_database

    seed_database(db_session)
    return db_session


@pytest.fixture
def login(client):
    from app.seed import TEST_PASSWORD

    def _login(email):
        resp = client.post(
            "/api/auth/login", json={"email": email, "password": TEST_PASSWORD}
        )
        assert resp.status_code == 200, resp.text
        return {"Authorization": f"Bearer {resp.json()['access_token']}"}

    return _login

VALID_APPLICATION = {
    "monthly_income": 20_000_000,
    "loan_amount": 100_000_000,
    "loan_term_months": 24,
    "estimated_monthly_payment": 5_000_000,
    "credit_history_note": "3 years, on time",
    "purpose": "Buy a motorbike",
    "cic_debt_group": 1,
}