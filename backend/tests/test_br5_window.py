from datetime import UTC, datetime, timedelta

import pytest

from app import scoring
from app.models import LoanApplication, LoanStatus, ScoringResult
from tests.conftest import VALID_APPLICATION


def _setup(client, seeded, login, minutes_ago):
    headers = login("hoang@branch.vn")
    loan_id = client.post("/api/loan-applications", headers=headers, json=VALID_APPLICATION).json()["id"]
    now = datetime.now(UTC)
    for i in range(3):
        seeded.add(ScoringResult(loan_application_id=loan_id, score=80, rejected_reason=None,
                                 model_version=scoring.MODEL_VERSION, explanation=["x"],
                                 created_at=now - timedelta(minutes=minutes_ago, seconds=i)))
    seeded.commit()
    return headers, loan_id


# TC-US04-30
def test_three_scorings_59_minutes_ago_still_block_the_fourth(client, seeded, login):
    headers, loan_id = _setup(client, seeded, login, 59)
    resp = client.post(f"/api/loan-applications/{loan_id}/score", headers=headers)
    assert resp.status_code == 429
    assert seeded.get(LoanApplication, loan_id).status == LoanStatus.MANUAL_REVIEW
    assert client.get(f"/api/loan-applications/{loan_id}", headers=headers).json()["status"] == "manual_review"


# TC-US04-31
def test_three_scorings_61_minutes_ago_do_not_block(client, seeded, login):
    headers, loan_id = _setup(client, seeded, login, 61)
    resp = client.post(f"/api/loan-applications/{loan_id}/score", headers=headers)
    assert resp.status_code == 201
    assert resp.json()["application"]["status"] != "manual_review"


@pytest.mark.parametrize("old,recent,status", [(5, 0, 201), (5, 2, 201), (0, 3, 429), (5, 3, 429)])
# TC-US04-32
def test_only_scorings_inside_the_window_are_counted(client, seeded, login, old, recent, status):
    headers = login("hoang@branch.vn")
    loan_id = client.post("/api/loan-applications", headers=headers, json=VALID_APPLICATION).json()["id"]
    now = datetime.now(UTC)
    for age in [timedelta(minutes=120)] * old + [timedelta(minutes=10)] * recent:
        seeded.add(ScoringResult(loan_application_id=loan_id, score=80, model_version=scoring.MODEL_VERSION,
                                 explanation=["x"], created_at=now - age))
    seeded.commit()
    assert client.post(f"/api/loan-applications/{loan_id}/score", headers=headers).status_code == status

@pytest.mark.parametrize("age,status", [
    (timedelta(hours=1) - timedelta(microseconds=1), 429),
    (timedelta(hours=1), 429),
    (timedelta(hours=1) + timedelta(microseconds=1), 201),
], ids=["inside-hour", "exactly-one-hour", "outside-hour"])
# TC-US04-47
def test_scoring_window_cutoff_is_inclusive_and_uses_a_fixed_clock(client, seeded, login, monkeypatch, age, status):
    from app import scoring_service

    now = datetime(2026, 10, 25, 12, 0, tzinfo=UTC)

    class Clock(datetime):
        @classmethod
        def now(cls, tz=None):
            return now.astimezone(tz) if tz is not None else now.replace(tzinfo=None)

    monkeypatch.setattr(scoring_service, "datetime", Clock)
    headers = login("hoang@branch.vn")
    response = client.post("/api/loan-applications", headers=headers, json=VALID_APPLICATION)
    assert response.status_code == 201
    loan_id = response.json()["id"]
    for _ in range(3):
        seeded.add(ScoringResult(loan_application_id=loan_id, score=80,
                                 model_version=scoring.MODEL_VERSION,
                                 explanation=["Existing result"], created_at=now - age))
    seeded.commit()

    response = client.post(f"/api/loan-applications/{loan_id}/score", headers=headers)
    assert response.status_code == status
    assert seeded.query(ScoringResult).filter_by(loan_application_id=loan_id).count() == (4 if status == 201 else 3)
    assert seeded.get(LoanApplication, loan_id).status == (LoanStatus.SCORED if status == 201 else LoanStatus.MANUAL_REVIEW)

