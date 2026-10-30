"""US02 and US10 acceptance tests on isolated SQLite, without a running server."""

import hashlib

import pytest

from app.models import EventLog, LoanApplication, LoanStatus, RevokedToken
from tests.conftest import VALID_APPLICATION

URL = "/api/loan-applications"


def create(client, headers, **changes):
    response = client.post(URL, headers=headers, json={**VALID_APPLICATION, **changes})
    assert response.status_code == 201, response.text
    return response.json()


# TC-US10-01
def test_partial_edit_revalidates_merged_data_flags_risk_and_preserves_identifiers(client, seeded, login):
    headers = login("hoang@branch.vn")
    loan = create(client, headers, citizen_id="001234567890")
    stored = seeded.get(LoanApplication, loan["id"])
    encrypted = stored.citizen_id_encrypted
    response = client.patch(f"{URL}/{loan['id']}", headers=headers, json={"monthly_income": 9_000_000})
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["monthly_income"] == 9_000_000 and data["dsr_flag_high_risk"] is True
    assert data["status"] == "pending" and data["latest_score"] is None
    seeded.refresh(stored)
    assert stored.citizen_id_encrypted == encrypted
    assert data["citizen_id_masked"] == "********7890"
    event = seeded.query(EventLog).filter_by(action="loan.edited").one()
    assert event.detail == "Updated fields: monthly_income"


# TC-US10-02
@pytest.mark.parametrize("patch", [
    {"monthly_income": 0}, {"monthly_income": None}, {"monthly_income": True},
    {"estimated_monthly_payment": 1}, {"loan_amount": 1},
    {"loan_amount": 100_000_000, "loan_term_months": 24, "estimated_monthly_payment": None},
    {"created_by": "forged"}, {"status": "approved"}, {"citizen_id_encrypted": "forged"}, {},
])
def test_invalid_edit_saves_nothing_and_creates_no_audit(client, seeded, login, patch):
    headers = login("hoang@branch.vn")
    loan = create(client, headers)
    response = client.patch(f"{URL}/{loan['id']}", headers=headers, json=patch)
    assert response.status_code == 422, response.text
    after = client.get(f"{URL}/{loan['id']}", headers=headers).json()
    for key in VALID_APPLICATION:
        assert after[key] == loan[key]
    assert seeded.query(EventLog).filter_by(action="loan.edited").count() == 0


# TC-US10-03
@pytest.mark.parametrize("status", [LoanStatus.SCORED, LoanStatus.REJECTED, LoanStatus.MANUAL_REVIEW, LoanStatus.APPROVED, LoanStatus.CANCELLED])
def test_processed_loans_cannot_be_edited(client, seeded, login, status):
    headers = login("hoang@branch.vn")
    loan = create(client, headers)
    stored = seeded.get(LoanApplication, loan["id"])
    stored.status = status
    seeded.commit()
    response = client.patch(f"{URL}/{loan['id']}", headers=headers, json={"purpose": "Changed"})
    assert response.status_code == 409
    assert response.json()["detail"] == "Application already processed, cannot be edited"


# TC-US10-04
def test_cancel_is_persistent_audited_idempotent_and_cannot_be_scored(client, seeded, login):
    headers = login("hoang@branch.vn")
    loan = create(client, headers)
    path = f"{URL}/{loan['id']}/cancel"
    assert client.patch(path, headers=headers).json()["status"] == "cancelled"
    assert client.patch(path, headers=headers).json()["status"] == "cancelled"
    assert client.get(f"{URL}/{loan['id']}", headers=headers).json()["status"] == "cancelled"
    assert client.post(f"{URL}/{loan['id']}/score", headers=headers).status_code == 409
    assert seeded.query(EventLog).filter_by(action="loan.cancelled").count() == 1


# TC-US10-05
def test_another_officer_cannot_edit_cancel_or_read_history(client, seeded, login):
    owner, other = login("hoang@branch.vn"), login("linh@branch.vn")
    loan = create(client, owner)
    assert client.patch(f"{URL}/{loan['id']}", headers=other, json={"purpose": "Changed"}).status_code == 403
    assert client.patch(f"{URL}/{loan['id']}/cancel", headers=other).status_code == 403
    assert client.get(f"{URL}/{loan['id']}/scores", headers=other).status_code == 403


# TC-US10-06
def test_scored_loan_cannot_be_cancelled(client, seeded, login):
    headers = login("hoang@branch.vn")
    loan = create(client, headers)
    assert client.post(f"{URL}/{loan['id']}/score", headers=headers).status_code == 201
    assert client.patch(f"{URL}/{loan['id']}/cancel", headers=headers).status_code == 409


# TC-US02-01
def test_logout_revokes_only_the_current_session_and_discards_raw_token(client, seeded, login):
    first = login("hoang@branch.vn")
    second = login("hoang@branch.vn")
    assert first != second
    assert client.post("/api/auth/logout", headers=first).status_code == 204
    assert client.get("/api/auth/me", headers=first).status_code == 401
    assert client.get("/api/auth/me", headers=second).status_code == 200
    raw = first["Authorization"].split()[1]
    revoked = seeded.query(RevokedToken).one()
    assert revoked.token_hash == hashlib.sha256(raw.encode()).hexdigest()
    assert revoked.token_hash != raw


# TC-US02-02
@pytest.mark.parametrize("path", ["/api/dashboard/summary", "/api/loan-applications", "/loan-applications"])
def test_protected_data_is_not_http_cached_after_logout(client, seeded, login, path):
    response = client.get(path, headers=login("hoang@branch.vn"))
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["pragma"] == "no-cache"


# TC-US02-03
def test_logout_without_a_session_is_401(client, seeded):
    assert client.post("/api/auth/logout").status_code == 401
    assert seeded.query(RevokedToken).count() == 0
