"""Golden cases: fixed input gives the exact score and reason list, so any scorer change fails a test."""
from types import SimpleNamespace

from app import scoring
from app.scoring_service import label_for


def _score(**kw):
    data = {"monthly_income": 20_000_000, "loan_amount": 100_000_000, "loan_term_months": 24,
            "estimated_monthly_payment": 5_000_000, "credit_history_note": "5 years", "cic_debt_group": 1}
    data.update(kw)
    return scoring.predict(scoring.build_features(SimpleNamespace(**data)))


# TC-US04-35
def test_golden_eligible_case():
    assert _score() == (95, [
        "+20: Installment is only 25% of monthly income (low debt burden).",
        "+5: Loan is only 0.4x the customer's yearly income.",
        "+10: The customer has a credit history on record.",
        "+10: CIC debt group 1 (standard, no overdue debt).",
    ])
    assert label_for(95).value == "eligible"


# TC-US04-36
def test_golden_review_case():
    assert _score(estimated_monthly_payment=8_000_000, cic_debt_group=2) == (60, [
        "+5: Installment is 40% of monthly income (acceptable, near the 50% limit).",
        "+5: Loan is only 0.4x the customer's yearly income.",
        "+10: The customer has a credit history on record.",
        "-10: CIC debt group 2 (debt needing attention).",
    ])
    assert label_for(60).value == "review"


# TC-US04-37
def test_golden_rejected_low_score_case():
    assert _score(monthly_income=6_000_000, loan_amount=80_000_000, estimated_monthly_payment=4_000_000,
                  credit_history_note="None", cic_debt_group=None) == (20, [
        "-25: Installment is 67% of monthly income, above the 50% limit.",
        "+5: Loan is only 1.1x the customer's yearly income.",
        "-10: No credit history, so repayment behaviour is unknown.",
        "0: CIC debt group is not available for this customer.",
    ])
    assert label_for(20).value == "rejected"


# TC-US04-38
def test_golden_no_history_phrase_case():
    assert _score(credit_history_note="Không có") == (75, [
        "+20: Installment is only 25% of monthly income (low debt burden).",
        "+5: Loan is only 0.4x the customer's yearly income.",
        "-10: No credit history, so repayment behaviour is unknown.",
        "+10: CIC debt group 1 (standard, no overdue debt).",
    ])


# TC-US04-39
def test_model_version_is_rules_v1():
    assert scoring.MODEL_VERSION == "rules-v1"
