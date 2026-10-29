"""Scoring module and service tested directly (no HTTP), so they can be reviewed and merged on their own."""
import itertools

import pytest
from fastapi import HTTPException

from app import scoring
from app.models import LoanApplication, LoanStatus, ScoreLabel, User
from app.scoring_service import MAX_SCORINGS_PER_HOUR, label_for, score_application


@pytest.fixture
def user(db_session):
    u = User(email="u@branch.vn", hashed_password="!", full_name="U")
    db_session.add(u)
    db_session.commit()
    return u


@pytest.fixture
def make_loan(db_session, user):
    def _make(**kw):
        data = {"created_by": user.id, "monthly_income": 20_000_000, "loan_amount": 100_000_000,
                    "loan_term_months": 24, "estimated_monthly_payment": 5_000_000,
                    "credit_history_note": "ok", "cic_debt_group": 1}
        data.update(kw)
        loan = LoanApplication(**data)
        db_session.add(loan)
        db_session.commit()
        return loan
    return _make


# TC-US04-15
def test_br6_label_boundaries():
    assert label_for(39) == ScoreLabel.REJECTED and label_for(40) == ScoreLabel.REVIEW
    assert label_for(69) == ScoreLabel.REVIEW and label_for(70) == ScoreLabel.ELIGIBLE


# TC-US04-16
def test_model_stays_inside_0_100_for_extreme_inputs():
    for dsr, ratio, term, group, hist in itertools.product([0.01, 0.4, 5], [0.1, 3, 50], [6, 60], [None, 1, 2], [True, False]):
        score, reasons = scoring.predict({"dsr": dsr, "loan_to_annual_income": ratio, "term_months": term,
                                              "cic_debt_group": group, "has_history": hist})
        assert 0 <= score <= 100 and len(reasons) >= 2


# TC-US04-17
def test_features_treat_none_as_no_history(make_loan):
    assert scoring.build_features(make_loan(credit_history_note="None"))["has_history"] is False
    assert scoring.build_features(make_loan(credit_history_note="5 years"))["has_history"] is True


# TC-US04-18
def test_br4_rejects_without_calling_the_model(db_session, user, make_loan, monkeypatch):
    monkeypatch.setattr(scoring, "predict", lambda f: pytest.fail("model must not be called"))
    loan = make_loan(cic_debt_group=5)
    result = score_application(db_session, loan, user)
    assert result.score is None and result.rejected_reason == "cic_bad_debt_group"
    assert loan.status == LoanStatus.REJECTED


# TC-US04-19
def test_br5_blocks_the_fourth_scoring(db_session, user, make_loan):
    loan = make_loan()
    for _ in range(MAX_SCORINGS_PER_HOUR):
        score_application(db_session, loan, user)
    with pytest.raises(HTTPException) as err:
        score_application(db_session, loan, user)
    assert err.value.status_code == 429 and loan.status == LoanStatus.MANUAL_REVIEW


# TC-US04-20
def test_br1_hides_an_out_of_range_score(db_session, user, make_loan, monkeypatch):
    monkeypatch.setattr(scoring, "predict", lambda f: (-3, ["x"]))
    loan = make_loan()
    result = score_application(db_session, loan, user)
    assert result.score is None and result.label is None and loan.status == LoanStatus.MANUAL_REVIEW


# TC-US04-21
def test_approved_or_cancelled_cannot_be_scored(db_session, user, make_loan):
    for status in (LoanStatus.CANCELLED, LoanStatus.APPROVED):
        with pytest.raises(HTTPException) as err:
            score_application(db_session, make_loan(status=status), user)
        assert err.value.status_code == 409


# TC-US04-33
@pytest.mark.parametrize(
    "note",
    ["N/A", "n/a", "Không có", "chưa có", "Chưa có", "KHÔNG", "no", "-", "0", "None.", "", "  ", None,
     "No credit history", " No  History ", "nil"],
)
def test_has_history_false_for_no_history_phrases(note):
    assert scoring.has_history(note) is False


# TC-US04-34
@pytest.mark.parametrize("note", ["5 years", "3 years, on time", "Đã vay 3 năm", "Normal history", "none of the loans were late"])
def test_has_history_true_for_real_notes(note):
    assert scoring.has_history(note) is True
