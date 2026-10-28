import pytest

from app.models import LoanApplication, LoanStatus, User
from tests.conftest import VALID_APPLICATION


def _create(client, headers, **overrides):
    return client.post("/api/loan-applications", headers=headers, json={**VALID_APPLICATION, **overrides})


# TC-US03-01
def test_create_saves_a_pending_application(client, seeded, login):
    resp = _create(client, login("hoang@branch.vn"))
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "pending" and body["dsr_flag_high_risk"] is False
    persisted = seeded.get(LoanApplication, body["id"])
    owner = seeded.query(User).filter_by(email="hoang@branch.vn").one()
    assert persisted is not None and persisted.status == LoanStatus.PENDING
    assert persisted.monthly_income == VALID_APPLICATION["monthly_income"]
    assert persisted.estimated_monthly_payment == VALID_APPLICATION["estimated_monthly_payment"]
    assert persisted.created_by == body["owner_id"] == owner.id


def test_br3_dsr_above_50_percent_is_flagged_but_still_saved(client, seeded, login):
    body = _create(client, login("hoang@branch.vn"), estimated_monthly_payment=15_000_000).json()
    assert body["dsr_flag_high_risk"] is True and body["status"] == "pending"


def test_br3_exactly_50_percent_is_not_flagged(client, seeded, login):
    body = _create(client, login("hoang@branch.vn"), estimated_monthly_payment=10_000_000).json()
    assert body["dsr_flag_high_risk"] is False


# TC-US03-02
def test_br2_zero_income_is_rejected_with_a_clear_message(client, seeded, login):
    resp = _create(client, login("hoang@branch.vn"), monthly_income=0)
    assert resp.status_code == 422
    assert resp.json()["errors"]["monthly_income"] == "Monthly income must be greater than 0 VND."
    assert resp.json()["detail"] == "Please correct the highlighted fields and submit again."


# TC-US09-01
def test_us09_missing_income_names_the_field(client, seeded, login):
    body = {k: v for k, v in VALID_APPLICATION.items() if k != "monthly_income"}
    resp = client.post("/api/loan-applications", headers=login("hoang@branch.vn"), json=body)
    assert resp.status_code == 422
    assert resp.json()["errors"]["monthly_income"] == "Monthly income is required."
    assert resp.json()["detail"] == "Please correct the highlighted fields and submit again."


# TC-US09-02
def test_us09_text_income_is_rejected_and_nothing_is_saved(client, seeded, login):
    headers = login("hoang@branch.vn")
    before = len(client.get("/api/loan-applications", headers=headers).json())
    resp = _create(client, headers, monthly_income="abc")
    assert resp.status_code == 422
    assert resp.json()["errors"]["monthly_income"] == "Monthly income must be a whole number."
    assert len(client.get("/api/loan-applications", headers=headers).json()) == before


# TC-US03-03
def test_all_field_errors_are_reported_together(client, seeded, login):
    resp = client.post("/api/loan-applications", headers=login("hoang@branch.vn"), json={})
    assert set(resp.json()["errors"]) == {
        "monthly_income", "loan_amount", "loan_term_months", "estimated_monthly_payment"}


@pytest.mark.parametrize("group", [0, 6, "x"])
# TC-US03-04
def test_cic_group_must_be_1_to_5(client, seeded, login, group):
    assert _create(client, login("hoang@branch.vn"), cic_debt_group=group).status_code == 422


def test_br8_user_sees_only_own_applications(client, seeded, login):
    mine = client.get("/api/loan-applications", headers=login("hoang@branch.vn")).json()
    owner = seeded.query(User).filter_by(email="hoang@branch.vn").one()
    assert len(mine) == 7 and {a["owner_id"] for a in mine} == {owner.id}


def test_br8_admin_sees_all_applications(client, seeded, login):
    assert len(client.get("/api/loan-applications", headers=login("thanh@branch.vn")).json()) == 12


def test_br8_user_gets_403_on_someone_elses_application(client, seeded, login):
    other = client.get("/api/loan-applications", headers=login("linh@branch.vn")).json()[0]["id"]
    resp = client.get(f"/api/loan-applications/{other}", headers=login("hoang@branch.vn"))
    assert resp.status_code == 403
    assert client.get(f"/api/loan-applications/{other}", headers=login("thanh@branch.vn")).status_code == 200


def test_unknown_application_is_404_with_a_message(client, seeded, login):
    resp = client.get("/api/loan-applications/nope", headers=login("hoang@branch.vn"))
    assert resp.status_code == 404 and "Application not found" in resp.json()["detail"]


# TC-US08-01
def test_dashboard_counts_todays_applications(client, seeded, login):
    headers = login("hoang@branch.vn")
    empty = client.get("/api/dashboard/summary", headers=headers).json()
    assert empty["total_applications"] == 0 and empty["average_score"] is None  # US08: shows 0, no error
    for _ in range(2):
        loan = _create(client, headers).json()
        client.post(f"/api/loan-applications/{loan['id']}/score", headers=headers)
    summary = client.get("/api/dashboard/summary", headers=headers).json()
    assert summary["total_applications"] == 2 and summary["average_score"] is not None


# TC-US08-02
def test_dashboard_requires_login(client, seeded):
    assert client.get("/api/dashboard/summary").status_code == 401