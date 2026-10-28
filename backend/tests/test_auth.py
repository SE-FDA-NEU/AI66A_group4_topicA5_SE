from datetime import UTC

import pytest

from app.models import User
from app.seed import TEST_PASSWORD


def _post(client, email, pw):
    return client.post("/api/auth/login", json={"email": email, "password": pw})


# TC-US01-01
def test_login_returns_token_and_user(client, seeded):
    resp = _post(client, "hoang@branch.vn", TEST_PASSWORD)
    assert resp.status_code == 200
    body = resp.json()
    assert body["user"]["role"] == "user" and body["access_token"]


# TC-US01-02
def test_email_is_case_insensitive(client, seeded):
    assert _post(client, " Hoang@Branch.vn ", TEST_PASSWORD).status_code == 200


# TC-US01-03
def test_wrong_password_is_401_with_a_clear_message(client, seeded):
    resp = _post(client, "hoang@branch.vn", "nope")
    assert resp.status_code == 401
    assert "incorrect" in resp.json()["detail"]


# TC-US01-04
def test_unknown_email_gives_the_same_401(client, seeded):
    assert _post(client, "ghost@branch.vn", "x").status_code == 401


# TC-US01-05
def test_account_locks_after_three_wrong_passwords(client, seeded):
    for _ in range(3):
        assert _post(client, "linh@branch.vn", "bad").status_code == 401
    # US01: the 4th attempt is refused, even with the right password
    resp = _post(client, "linh@branch.vn", TEST_PASSWORD)
    assert resp.status_code == 423
    assert "15 minutes" in resp.json()["detail"]


# TC-US01-06
def test_successful_login_resets_the_failure_counter(client, seeded):
    _post(client, "linh@branch.vn", "bad")
    _post(client, "linh@branch.vn", "bad")
    assert _post(client, "linh@branch.vn", TEST_PASSWORD).status_code == 200
    user = seeded.query(User).filter_by(email="linh@branch.vn").one()
    seeded.refresh(user)
    assert user.failed_login_count == 0


def test_protected_route_needs_a_token(client, seeded):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer junk"}).status_code == 401


def test_me_returns_the_current_user(client, seeded, login):
    assert client.get("/api/auth/me", headers=login("thanh@branch.vn")).json()["role"] == "admin"


# TC-US01-07
def test_lock_duration_is_fifteen_minutes(client, seeded):
    from datetime import datetime, timedelta

    before = datetime.now(UTC)
    for _ in range(3):
        _post(client, "linh@branch.vn", "bad")
    after = datetime.now(UTC)
    user = seeded.query(User).filter_by(email="linh@branch.vn").one()
    seeded.refresh(user)
    locked_until = user.locked_until
    if locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=UTC)
    assert before + timedelta(minutes=15) <= locked_until <= after + timedelta(minutes=15)


# TC-US01-08
def test_login_succeeds_after_lock_expires(client, seeded):
    from datetime import datetime, timedelta

    for _ in range(3):
        _post(client, "linh@branch.vn", "bad")
    assert _post(client, "linh@branch.vn", TEST_PASSWORD).status_code == 423
    user = seeded.query(User).filter_by(email="linh@branch.vn").one()
    user.locked_until = datetime.now(UTC) - timedelta(seconds=1)
    seeded.commit()
    resp = _post(client, "linh@branch.vn", TEST_PASSWORD)
    assert resp.status_code == 200
    seeded.refresh(user)
    assert user.failed_login_count == 0
    assert user.locked_until is None


def test_expired_token_is_refused(client, seeded):
    from datetime import datetime, timedelta

    import jwt

    from app.config import get_settings

    user = seeded.query(User).filter_by(email="hoang@branch.vn").one()
    token = jwt.encode(
        {"sub": user.id, "role": user.role.value,
         "exp": datetime.now(UTC) - timedelta(minutes=1)},
        get_settings().JWT_SECRET, algorithm="HS256",
    )
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
    assert "sign in again" in resp.json()["detail"]

def _failed_count(db, email):
    db.expire_all()
    return db.query(User).filter_by(email=email).one().failed_login_count


# TC-US01-09
@pytest.mark.parametrize(
    ("payload", "field", "message"),
    [
        ({"email": "", "password": "x"}, "email", "Email is required."),
        ({"email": "   ", "password": "x"}, "email", "Email is required."),
        ({"email": None, "password": "x"}, "email", "Email is required."),
        ({"password": "x"}, "email", "Email is required."),
        ({"email": "hoang@branch.vn", "password": ""}, "password", "Password is required."),
        ({"email": "hoang@branch.vn", "password": "   "}, "password", "Password is required."),
        ({"email": "hoang@branch.vn", "password": None}, "password", "Password is required."),
        ({"email": "hoang@branch.vn"}, "password", "Password is required."),
        ({"email": 123, "password": "x"}, "email", "Email must be text."),
        ({"email": ["a"], "password": "x"}, "email", "Email must be text."),
        ({"email": "hoang@branch.vn", "password": 123}, "password", "Password must be text."),
        ({"email": "hoang@branch.vn", "password": ["a"]}, "password", "Password must be text."),
        ({"email": "a" * 255, "password": "x"}, "email", "Email must not exceed 254 characters."),
        ({"email": "hoang@branch.vn", "password": "p" * 129}, "password", "Password must not exceed 128 characters."),
    ],
)
def test_invalid_login_input_is_422_and_not_counted_as_a_failure(client, seeded, payload, field, message):
    resp = client.post("/api/auth/login", json=payload)
    assert resp.status_code == 422
    assert resp.json()["errors"][field] == message
    assert _failed_count(seeded, "hoang@branch.vn") == 0
    assert _post(client, "hoang@branch.vn", TEST_PASSWORD).status_code == 200


# TC-US01-10
def test_login_edge_lengths_are_accepted_as_input(client, seeded):
    # Exactly at the limits: passes validation, then fails as a normal wrong login.
    resp = client.post("/api/auth/login", json={"email": "a" * 254, "password": "p" * 128})
    assert resp.status_code == 401


# TC-US01-11
@pytest.mark.parametrize("body", [b"{bad", b"[]", b"null", b""])
def test_malformed_login_body_is_422_and_not_counted(client, seeded, body):
    resp = client.post("/api/auth/login", content=body, headers={"content-type": "application/json"})
    assert resp.status_code == 422
    assert list(resp.json()["errors"]) == ["form"]
    assert _failed_count(seeded, "hoang@branch.vn") == 0


# TC-US01-12
def test_validation_error_does_not_add_to_an_existing_failure_count(client, seeded):
    assert _post(client, "hoang@branch.vn", "wrong").status_code == 401
    assert _failed_count(seeded, "hoang@branch.vn") == 1
    assert client.post("/api/auth/login", json={"email": "hoang@branch.vn", "password": ""}).status_code == 422
    assert _failed_count(seeded, "hoang@branch.vn") == 1
