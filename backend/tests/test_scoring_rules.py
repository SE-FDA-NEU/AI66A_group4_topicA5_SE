import pytest

from app import scoring

BASE = {"dsr": 0.20, "loan_to_annual_income": 1.0, "term_months": 12, "cic_debt_group": 1, "has_history": True}
# BASE scores 50 + 20 (dsr) + 5 (ratio) + 10 (history) + 10 (cic 1) = 95, the best case.


def _score(**overrides):
    return scoring.predict({**BASE, **overrides})[0]


@pytest.mark.parametrize("dsr,expected", [
    (0.29, 95), (0.30, 95), (0.3001, 80),
    (0.50, 80), (0.5001, 50),
])
# TC-US04-22
def test_dsr_thresholds_both_sides(dsr, expected):
    assert _score(dsr=dsr) == expected


@pytest.mark.parametrize("ratio,expected", [
    (2, 95), (2.0001, 85),
    (5, 85), (5.0001, 75),
])
# TC-US04-23
def test_loan_to_annual_income_thresholds_both_sides(ratio, expected):
    assert _score(loan_to_annual_income=ratio) == expected


@pytest.mark.parametrize("term,expected", [(1, 95), (48, 95), (49, 90), (600, 90)])
# TC-US04-24
def test_term_threshold_at_48_and_49_months(term, expected):
    assert _score(term_months=term) == expected


@pytest.mark.parametrize("group,expected", [(None, 85), (1, 95), (2, 75)])
# TC-US04-25
def test_cic_group_none_1_and_2(group, expected):
    assert _score(cic_debt_group=group) == expected


@pytest.mark.parametrize("history,expected", [(True, 95), (False, 75)])
# TC-US04-26
def test_credit_history_flag(history, expected):
    assert _score(has_history=history) == expected


# TC-US04-27
def test_best_case_is_95_with_no_negative_reason():
    score, reasons = scoring.predict(BASE)
    assert score == 95
    assert not [r for r in reasons if r.startswith("-")]


# TC-US04-28
def test_worst_raw_value_minus_15_is_clamped_to_zero():
    worst = {"dsr": 0.90, "loan_to_annual_income": 10.0, "term_months": 60, "cic_debt_group": 2, "has_history": False}
    # 50 - 25 - 15 - 10 - 10 - 5 = -15 before clamping
    score, reasons = scoring.predict(worst)
    assert score == 0
    assert [r.split(":")[0] for r in reasons if r[0] in "+-"] == ["-25", "-15", "-10", "-10", "-5"]


# TC-US04-29
def test_score_is_never_below_zero_or_above_95_across_the_grid():
    for dsr in (0.1, 0.3, 0.5, 0.9):
        for ratio in (1, 2, 5, 9):
            for term in (12, 48, 49):
                for group in (None, 1, 2):
                    for history in (True, False):
                        score = _score(dsr=dsr, loan_to_annual_income=ratio, term_months=term,
                                       cic_debt_group=group, has_history=history)
                        assert type(score) is int and 0 <= score <= 95
