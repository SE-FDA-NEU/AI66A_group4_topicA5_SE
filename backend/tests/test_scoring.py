from datetime import UTC, datetime, timedelta

import pytest

from app import scoring
from app.models import LoanApplication, ScoringResult
from tests.conftest import VALID_APPLICATION


def _new(client, headers, **overrides):
    return client.post("/api/loan-applications", headers=headers, json={**VALID_APPLICATION, **overrides}).json()["id"]


def _score(client, headers, loan_id):
    return client.post(f"/api/loan-applications/{loan_id}/score", headers=headers)


# TC-US04-01
def test_score_is_an_integer_with_explanations(client, seeded, login):
    h = login("hoang@branch.vn")
    resp = _score(client, h, _new(client, h))
    assert resp.status_code == 201
    result = resp.json()["result"]
    assert isinstance(result["score"], int) and 0 <= result["score"] <= 100
    assert len(result["explanation"]) >= 2 and result["model_version"] == scoring.MODEL_VERSION


# TC-US04-02
def test_same_input_gives_same_score(client, seeded, login):
    h = login("hoang@branch.vn")
    first = _score(client, h, _new(client, h)).json()["result"]["score"]
    second = _score(client, h, _new(client, h)).json()["result"]["score"]
    assert first == second


# TC-US04-03
def test_low_score_is_rejected_with_at_least_two_reasons(client, seeded, login):
    h = login("hoang@branch.vn")
    loan_id = _new(client, h, monthly_income=8_000_000, loan_amount=600_000_000,
                   estimated_monthly_payment=6_000_000, credit_history_note="None", cic_debt_group=2)
    body = _score(client, h, loan_id).json()
    assert body["result"]["score"] < 40 and body["result"]["label"] == "rejected"
    assert len(body["result"]["explanation"]) >= 2 and body["application"]["status"] == "rejected"


@pytest.mark.parametrize("group", [3, 4, 5])
# TC-US04-04
def test_br4_bad_debt_group_is_rejected_without_calling_the_model(client, seeded, login, monkeypatch, group):
    monkeypatch.setattr(scoring, "predict", lambda f: (_ for _ in ()).throw(AssertionError("model called")))
    h = login("hoang@branch.vn")
    body = _score(client, h, _new(client, h, cic_debt_group=group)).json()
    assert body["result"]["score"] is None and body["result"]["rejected_reason"] == "cic_bad_debt_group"
    assert body["application"]["status"] == "rejected"


@pytest.mark.parametrize("raw_score", [-1, 132, True, None, "80", float("nan")])
# TC-US04-05
def test_br1_out_of_range_score_is_hidden_and_goes_to_manual_review(client, seeded, login, monkeypatch, raw_score):
    monkeypatch.setattr(scoring, "predict", lambda f: (raw_score, ["x"]))
    h = login("hoang@branch.vn")
    body = _score(client, h, _new(client, h)).json()
    assert body["result"]["score"] is None and body["application"]["status"] == "manual_review"


@pytest.mark.parametrize("score,label,status", [
    (0, "rejected", "rejected"), (39, "rejected", "rejected"),
    (40, "review", "scored"), (69, "review", "scored"),
    (70, "eligible", "scored"), (100, "eligible", "scored"),
])
# TC-US04-06
def test_br1_br6_boundaries_persist_after_reload(client, seeded, login, monkeypatch, score, label, status):
    monkeypatch.setattr(scoring, "predict", lambda f: (score, ["Factor one", "Factor two"]))
    headers = login("hoang@branch.vn")
    loan_id = _new(client, headers)
    assert _score(client, headers, loan_id).status_code == 201
    detail = client.get(f"/api/loan-applications/{loan_id}", headers=headers).json()
    assert detail["latest_score"]["score"] == score
    assert detail["latest_score"]["label"] == label and detail["status"] == status


# TC-US04-07
def test_br5_fourth_scoring_in_an_hour_is_blocked(client, seeded, login):
    h = login("hoang@branch.vn")
    loan_id = _new(client, h)
    for _ in range(3):
        assert _score(client, h, loan_id).status_code == 201
    resp = _score(client, h, loan_id)
    assert resp.status_code == 429 and "manager" in resp.json()["detail"]
    assert client.get(f"/api/loan-applications/{loan_id}", headers=h).json()["status"] == "manual_review"


# TC-US04-08
def test_br5_old_scorings_do_not_count(client, seeded, login):
    h = login("hoang@branch.vn")
    loan_id = _new(client, h)
    for _ in range(3):
        _score(client, h, loan_id)
    old = datetime.now(UTC) - timedelta(hours=2)
    for r in seeded.query(ScoringResult).filter_by(loan_application_id=loan_id):
        r.created_at = old
    seeded.commit()
    assert _score(client, h, loan_id).status_code == 201


# TC-US04-09
def test_br3_high_risk_flag_stays_even_with_a_good_score(client, seeded, login):
    h = login("hoang@branch.vn")
    body = _score(client, h, _new(client, h, estimated_monthly_payment=11_000_000)).json()
    assert body["application"]["dsr_flag_high_risk"] is True


# TC-US04-10
def test_cancelled_application_cannot_be_scored(client, seeded, login):
    h = login("linh@branch.vn")
    cancelled = seeded.query(LoanApplication).filter_by(status="cancelled").one()
    resp = _score(client, h, cancelled.id)
    assert resp.status_code == 409


# TC-US04-11
def test_score_history_lists_every_attempt(client, seeded, login):
    h = login("hoang@branch.vn")
    loan_id = _new(client, h)
    _score(client, h, loan_id)
    _score(client, h, loan_id)
    assert len(client.get(f"/api/loan-applications/{loan_id}/scores", headers=h).json()) == 2


# TC-US04-12
def test_user_cannot_score_someone_elses_application(client, seeded, login):
    other = client.get("/api/loan-applications", headers=login("linh@branch.vn")).json()[0]["id"]
    assert _score(client, login("hoang@branch.vn"), other).status_code == 403


# TC-US04-13
def test_br5_also_limits_cic_rejections(client, seeded, login):
    h = login("hoang@branch.vn")
    loan_id = _new(client, h, cic_debt_group=4)
    for _ in range(3):
        assert _score(client, h, loan_id).status_code == 201
    assert _score(client, h, loan_id).status_code == 429
    assert len(client.get(f"/api/loan-applications/{loan_id}/scores", headers=h).json()) == 3
    assert client.get(f"/api/loan-applications/{loan_id}", headers=h).json()["status"] == "manual_review"


# TC-US04-14
def test_br1_fractional_score_is_hidden(client, seeded, login, monkeypatch):
    monkeypatch.setattr(scoring, "predict", lambda f: (75.5, ["x"]))
    h = login("hoang@branch.vn")
    response = _score(client, h, _new(client, h)).json()
    assert response["result"]["score"] is None
    assert response["application"]["status"] == "manual_review"