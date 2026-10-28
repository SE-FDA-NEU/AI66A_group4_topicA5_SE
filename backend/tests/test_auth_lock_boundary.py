"""US01: create a fifteen-minute lock and check its exact expiry."""
from datetime import UTC, datetime, timedelta

import pytest

from app.models import User
from app.routers import auth
from app.security import hash_password
from app.seed import TEST_PASSWORD


# TC-US01-14
@pytest.mark.parametrize(
    ("offset_microseconds", "expected_status"),
    [(-1, 423), (0, 200), (1, 200)],
    ids=["just-before-expiry", "at-expiry", "just-after-expiry"],
)
def test_login_lock_boundary_at_fifteen_minutes(
    client, db_session, monkeypatch, offset_microseconds, expected_status,
):
    started = datetime(2026, 10, 28, 8, 0, tzinfo=UTC)
    expires = started + timedelta(minutes=15)
    instant = started

    class FrozenDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            return instant.astimezone(tz) if tz else instant.replace(tzinfo=None)

    monkeypatch.setattr(auth, "datetime", FrozenDatetime)
    user = User(
        email="boundary@branch.vn", full_name="Boundary Officer",
        hashed_password=hash_password(TEST_PASSWORD),
    )
    db_session.add(user)
    db_session.commit()

    # Exercise the real lock creation, rather than pre-populating its expiry.
    for _ in range(3):
        response = client.post(
            "/api/auth/login", json={"email": user.email, "password": "wrong"},
        )
        assert response.status_code == 401
    db_session.refresh(user)
    assert user.locked_until.replace(tzinfo=UTC) == expires
    assert user.failed_login_count == 0

    instant = expires + timedelta(microseconds=offset_microseconds)
    response = client.post(
        "/api/auth/login",
        json={"email": user.email, "password": TEST_PASSWORD},
    )
    assert response.status_code == expected_status
    db_session.refresh(user)
    if expected_status == 423:
        assert "15 minutes" in response.json()["detail"]
        assert user.locked_until.replace(tzinfo=UTC) == expires
        assert user.failed_login_count == 0
    else:
        assert response.json()["access_token"]
        assert user.locked_until is None and user.failed_login_count == 0
