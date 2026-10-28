import re
import unicodedata

MODEL_VERSION = 'rules-v1'

# Normalised (lowercase, no accents, no punctuation) notes that mean "no history".
NO_HISTORY_PHRASES = frozenset({
    "", "none", "no", "na", "nil", "0", "khong", "khong co", "chua co", "chua",
    "no credit history", "no history",
})


def has_history(note) -> bool:
    text = unicodedata.normalize("NFD", (note or "").lower().replace("đ", "d"))
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = "".join(c for c in text if unicodedata.category(c)[0] not in "PS")
    return re.sub(r"\s+", " ", text).strip() not in NO_HISTORY_PHRASES


def build_features(loan) -> dict:
    income = loan.monthly_income
    return {
        "dsr": loan.estimated_monthly_payment / income,
        "loan_to_annual_income": loan.loan_amount / (income * 12),
        "term_months": loan.loan_term_months,
        "cic_debt_group": loan.cic_debt_group,
        "has_history": has_history(loan.credit_history_note),
    }


def predict(features: dict) -> tuple[int, list[str]]:
    score, reasons = 50, []  # best case is 95, so this stub never leaves 0-100 on the high side

    dsr = features["dsr"]
    if dsr <= 0.30:
        score += 20
        reasons.append(f"+20: Installment is only {dsr:.0%} of monthly income (low debt burden).")
    elif dsr <= 0.50:
        score += 5
        reasons.append(f"+5: Installment is {dsr:.0%} of monthly income (acceptable, near the 50% limit).")
    else:
        score -= 25
        reasons.append(f"-25: Installment is {dsr:.0%} of monthly income, above the 50% limit.")

    ratio = features["loan_to_annual_income"]
    if ratio > 5:
        score -= 15
        reasons.append(f"-15: Loan is {ratio:.1f}x the customer's yearly income (very large).")
    elif ratio > 2:
        score -= 5
        reasons.append(f"-5: Loan is {ratio:.1f}x the customer's yearly income (large).")
    else:
        score += 5
        reasons.append(f"+5: Loan is only {ratio:.1f}x the customer's yearly income.")

    if features["has_history"]:
        score += 10
        reasons.append("+10: The customer has a credit history on record.")
    else:
        score -= 10
        reasons.append("-10: No credit history, so repayment behaviour is unknown.")

    group = features["cic_debt_group"]
    if group is None:
        reasons.append("0: CIC debt group is not available for this customer.")
    elif group == 1:
        score += 10
        reasons.append("+10: CIC debt group 1 (standard, no overdue debt).")
    elif group == 2:
        score -= 10
        reasons.append("-10: CIC debt group 2 (debt needing attention).")

    if features["term_months"] > 48:
        score -= 5
        reasons.append(f"-5: Long loan term ({features['term_months']} months) increases uncertainty.")

    return max(0, score), reasons
