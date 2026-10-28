import pytest

from app import scoring
from app.models import EventLog, LoanApplication, LoanStatus
from tests.conftest import VALID_APPLICATION


def new_scored(client, login, **changes):
    officer = login("hoang@branch.vn")
    loan = client.post("/api/loan-applications", headers=officer,
                       json={**VALID_APPLICATION, **changes}).json()
    client.post(f"/api/loan-applications/{loan['id']}/score", headers=officer)
    return loan["id"], officer


def approve(client, login, loan_id):
    return client.patch(f"/api/loan-applications/{loan_id}/approve", headers=login("thanh@branch.vn"))


def test_manager_approval_persists_actor_time_and_blocks_rescoring(client, seeded, login):
    loan_id, officer = new_scored(client, login)
    response = approve(client, login, loan_id)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "approved"
    assert data["approval"]["actor_name"] == "Do Hong Thanh"
    assert data["approval"]["approved_at"]
    log = seeded.query(EventLog).filter_by(loan_application_id=loan_id, action="loan.approved").one()
    assert log.actor_id == data["approval"]["actor_id"]
    reloaded = client.get(f"/api/loan-applications/{loan_id}", headers=officer).json()
    assert reloaded["status"] == "approved" and reloaded["approval"] == data["approval"]
    assert client.post(f"/api/loan-applications/{loan_id}/score", headers=officer).status_code == 409


def test_officer_cannot_approve_own_application(client, seeded, login):
    loan_id, officer = new_scored(client, login)
    assert client.patch(f"/api/loan-applications/{loan_id}/approve", headers=officer).status_code == 403
    assert seeded.query(EventLog).filter_by(action="loan.approved").count() == 0


def test_anonymous_approval_is_denied(client):
    assert client.patch("/api/loan-applications/missing/approve").status_code == 401


def test_manager_approval_missing_application(client, seeded, login):
    assert approve(client, login, "missing").status_code == 404


@pytest.mark.parametrize("status", [LoanStatus.PENDING, LoanStatus.CANCELLED, LoanStatus.REJECTED, LoanStatus.APPROVED])
def test_invalid_status_cannot_be_approved(client, seeded, login, status):
    loan_id, _ = new_scored(client, login)
    loan = seeded.get(LoanApplication, loan_id)
    loan.status = status
    seeded.commit()
    assert approve(client, login, loan_id).status_code == 409
    assert seeded.query(EventLog).filter_by(action="loan.approved").count() == 0


@pytest.mark.parametrize("score", [35, 60, 132])
def test_ineligible_or_invalid_score_cannot_be_approved(client, seeded, login, monkeypatch, score):
    monkeypatch.setattr(scoring, "predict", lambda f: (score, ["reason one", "reason two"]))
    loan_id, _ = new_scored(client, login)
    assert approve(client, login, loan_id).status_code == 409


def test_unscored_application_cannot_be_approved(client, seeded, login):
    loan_id = seeded.query(LoanApplication).filter_by(status=LoanStatus.PENDING).first().id
    assert approve(client, login, loan_id).status_code == 409


def test_cic_bad_debt_cannot_be_approved(client, seeded, login):
    loan_id, _ = new_scored(client, login, cic_debt_group=4)
    assert approve(client, login, loan_id).status_code == 409


def test_latest_score_controls_approval(client, seeded, login, monkeypatch):
    loan_id, officer = new_scored(client, login)
    monkeypatch.setattr(scoring, "predict", lambda f: (60, ["reason one", "reason two"]))
    client.post(f"/api/loan-applications/{loan_id}/score", headers=officer)
    assert approve(client, login, loan_id).status_code == 409


def test_repeat_approval_does_not_duplicate_audit(client, seeded, login):
    loan_id, _ = new_scored(client, login)
    assert approve(client, login, loan_id).status_code == 200
    assert approve(client, login, loan_id).status_code == 409
    assert seeded.query(EventLog).filter_by(action="loan.approved").count() == 1


def test_manager_can_review_high_risk_eligible_result(client, seeded, login, monkeypatch):
    monkeypatch.setattr(scoring, "predict", lambda f: (80, ["reason one", "reason two"]))
    loan_id, _ = new_scored(client, login, estimated_monthly_payment=15_000_000)
    response = approve(client, login, loan_id)
    assert response.status_code == 200 and response.json()["dsr_flag_high_risk"] is True
    assert "high risk: True" in seeded.query(EventLog).filter_by(action="loan.approved").one().detail


def test_br5_review_can_be_resolved_by_manager_with_eligible_score(client, seeded, login):
    loan_id, officer = new_scored(client, login)
    for _ in range(2):
        client.post(f"/api/loan-applications/{loan_id}/score", headers=officer)
    assert client.post(f"/api/loan-applications/{loan_id}/score", headers=officer).status_code == 429
    assert approve(client, login, loan_id).status_code == 200
