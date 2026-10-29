"""Sprint 4 boundary cases that were missing from the per-feature test files."""
from datetime import timedelta

from app.models import LoanApplication, User, now_utc
from app.seed import TEST_PASSWORD
from tests.conftest import VALID_APPLICATION

LOGIN = "/api/auth/login"
LOANS = "/api/loan-applications"
EMAIL = "linh@branch.vn"


def _login(client, password):
    return client.post(LOGIN, json={"email": EMAIL, "password": password})


def _create(client, headers, **overrides):
    return client.post(LOANS, headers=headers, json={**VALID_APPLICATION, **overrides})


# TC-US01-13
def test_two_wrong_passwords_do_not_lock_but_the_third_does(client, seeded):
    for _ in range(2):
        assert _login(client, "bad").status_code == 401
    user = seeded.query(User).filter_by(email=EMAIL).one()
    seeded.refresh(user)
    assert user.locked_until is None and user.failed_login_count == 2
    assert _login(client, "bad").status_code == 401  # 3rd failure sets the lock
    seeded.refresh(user)
    assert user.locked_until is not None
    assert _login(client, TEST_PASSWORD).status_code == 423


# TC-US03-15
def test_br3_dsr_exactly_50_percent_is_saved_and_not_flagged(client, seeded, login):
    # income 20,000,000 and payment 10,000,000 gives DSR = 50% exactly
    resp = _create(client, login("hoang@branch.vn"), estimated_monthly_payment=10_000_000)
    assert resp.status_code == 201
    assert resp.json()["dsr_flag_high_risk"] is False
    assert seeded.get(LoanApplication, resp.json()["id"]).dsr_flag_high_risk is False


# TC-US03-16
def test_br3_dsr_one_dong_above_50_percent_is_flagged_and_saved(client, seeded, login):
    resp = _create(client, login("hoang@branch.vn"), estimated_monthly_payment=10_000_001)
    assert resp.status_code == 201
    assert resp.json()["dsr_flag_high_risk"] is True
    assert seeded.get(LoanApplication, resp.json()["id"]).dsr_flag_high_risk is True


# TC-US03-17
def test_br2_zero_income_saves_nothing(client, seeded, login):
    before = seeded.query(LoanApplication).count()
    resp = _create(client, login("hoang@branch.vn"), monthly_income=0)
    assert resp.status_code == 422
    assert seeded.query(LoanApplication).count() == before


# TC-US08-03
def test_dashboard_ignores_applications_created_before_today(client, seeded, login):
    headers = login("hoang@branch.vn")
    loan_id = _create(client, headers).json()["id"]
    assert client.get("/api/dashboard/summary", headers=headers).json()["total_applications"] == 1
    loan = seeded.get(LoanApplication, loan_id)
    loan.created_at = now_utc() - timedelta(days=2)
    seeded.commit()
    summary = client.get("/api/dashboard/summary", headers=headers).json()
    assert summary["total_applications"] == 0 and summary["average_score"] is None
    assert summary["high_risk_count"] == 0
