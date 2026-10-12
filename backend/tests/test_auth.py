from app.models import User
from app.seed import TEST_PASSWORD


def _post(client, email, pw):
    return client.post("/api/auth/login", json={"email": email, "password": pw})


def test_login_returns_token_and_user(client, seeded):
    resp = _post(client, "hoang@branch.vn", TEST_PASSWORD)
    assert resp.status_code == 200
    body = resp.json()
    assert body["user"]["role"] == "user" and body["access_token"]


def test_email_is_case_insensitive(client, seeded):
    assert _post(client, " Hoang@Branch.vn ", TEST_PASSWORD).status_code == 200


def test_wrong_password_is_401_with_a_clear_message(client, seeded):
    resp = _post(client, "hoang@branch.vn", "nope")
    assert resp.status_code == 401
    assert "incorrect" in resp.json()["detail"]


def test_unknown_email_gives_the_same_401(client, seeded):
    assert _post(client, "ghost@branch.vn", "x").status_code == 401


def test_account_locks_after_three_wrong_passwords(client, seeded):
    for _ in range(3):
        assert _post(client, "linh@branch.vn", "bad").status_code == 401
    # US01: the 4th attempt is refused, even with the right password
    resp = _post(client, "linh@branch.vn", TEST_PASSWORD)
    assert resp.status_code == 423
    assert "15 minutes" in resp.json()["detail"]


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


def test_lock_duration_is_fifteen_minutes(client, seeded):
    from datetime import datetime, timedelta, timezone

    before = datetime.now(timezone.utc)
    for _ in range(3):
        _post(client, "linh@branch.vn", "bad")
    after = datetime.now(timezone.utc)
    user = seeded.query(User).filter_by(email="linh@branch.vn").one()
    seeded.refresh(user)
    locked_until = user.locked_until
    if locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)
    assert before + timedelta(minutes=15) <= locked_until <= after + timedelta(minutes=15)


def test_login_succeeds_after_lock_expires(client, seeded):
    from datetime import datetime, timedelta, timezone

    for _ in range(3):
        _post(client, "linh@branch.vn", "bad")
    assert _post(client, "linh@branch.vn", TEST_PASSWORD).status_code == 423
    user = seeded.query(User).filter_by(email="linh@branch.vn").one()
    user.locked_until = datetime.now(timezone.utc) - timedelta(seconds=1)
    seeded.commit()
    resp = _post(client, "linh@branch.vn", TEST_PASSWORD)
    assert resp.status_code == 200
    seeded.refresh(user)
    assert user.failed_login_count == 0
    assert user.locked_until is None


def test_expired_token_is_refused(client, seeded):
    from datetime import datetime, timedelta, timezone
    import jwt
    from app.config import get_settings

    user = seeded.query(User).filter_by(email="hoang@branch.vn").one()
    token = jwt.encode(
        {"sub": user.id, "role": user.role.value,
         "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        get_settings().JWT_SECRET, algorithm="HS256",
    )
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
    assert "sign in again" in resp.json()["detail"]
