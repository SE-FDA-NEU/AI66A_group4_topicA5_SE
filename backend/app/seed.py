from datetime import UTC, datetime, timedelta

from app import scoring
from app.database import Base, SessionLocal, engine
from app.models import (
    LoanApplication,
    LoanStatus,
    ScoreLabel,
    ScoringResult,
    User,
    UserRole,
)
from app.scoring_service import label_for
from app.security import hash_password

# Demo password
TEST_PASSWORD = "Demo@2026"

USERS = [
    {"email": "hoang@branch.vn", "full_name": "Do Viet Hoang", "role": UserRole.USER},
    {"email": "linh@branch.vn", "full_name": "Nguyen Thu Linh", "role": UserRole.USER},
    {"email": "thanh@branch.vn", "full_name": "Do Hong Thanh", "role": UserRole.ADMIN},
]

P, R, C = LoanStatus.PENDING, LoanStatus.REJECTED, LoanStatus.CANCELLED
S, M = LoanStatus.SCORED, LoanStatus.MANUAL_REVIEW

# Amounts are whole VND.
# (owner, monthly income, loan amount, term in months, est. monthly payment, purpose, credit history note, CIC debt group, status)
LOANS = [
    ("hoang@branch.vn", 15_000_000, 100_000_000, 24, 4_500_000, "Buy a motorbike", "3 years of consumer loans, always paid on time", 1, S),
    ("hoang@branch.vn", 8_000_000, 200_000_000, 36, 6_500_000, "Home renovation", "No credit history", None, R),
    ("hoang@branch.vn", 30_000_000, 500_000_000, 60, 10_000_000, "Buy a car", "5 years, one minor late payment", 1, S),
    ("hoang@branch.vn", 12_000_000, 50_000_000, 12, 4_500_000, "Small business", "2 years, steady repayments", None, P),
    ("hoang@branch.vn", 20_000_000, 150_000_000, 24, 6_800_000, "Child's tuition abroad", "7 years of good history", 1, P),
    ("hoang@branch.vn", 6_000_000, 80_000_000, 24, 3_600_000, "Consumer spending", "None", None, R),
    ("hoang@branch.vn", 25_000_000, 300_000_000, 48, 7_500_000, "Buy a house", "10 years, good credit", 2, M),
    ("linh@branch.vn", 10_000_000, 60_000_000, 18, 3_800_000, "Medical expenses", "1 year", 2, S),
    ("linh@branch.vn", 18_000_000, 120_000_000, 24, 5_200_000, "Expand a shop", "4 years, stable", 1, S),
    ("linh@branch.vn", 9_000_000, 90_000_000, 36, 3_100_000, "Buy home appliances", "None", None, C),
    ("linh@branch.vn", 40_000_000, 600_000_000, 60, 12_000_000, "Investment", "12 years of excellent history", 1, P),
    ("linh@branch.vn", 7_000_000, 70_000_000, 24, 4_900_000, "Urgent consumer spending", "Bad debt in the past", 4, R),
]

# Index in LOANS -> how the app's scoring left that loan (statuses above match scoring_service.py):
# scored by the real model, BR4 rejection (CIC 3-5), or BR1 manual review (invalid model score).
SCORED = {0, 1, 2, 5, 7, 8, 9}  # 9 was scored, then cancelled by the officer
BR4_REJECTED = {11}
BR1_MANUAL_REVIEW = {6}


def _scoring_result(loan, index, created) -> ScoringResult:
    features = scoring.build_features(loan)
    common = {"loan_application_id": loan.id, "input_snapshot": features, "created_at": created}
    if index in BR4_REJECTED:
        return ScoringResult(
            score=None, label=ScoreLabel.REJECTED, rejected_reason="cic_bad_debt_group", model_version=None,
            explanation=[
                f"CIC debt group {loan.cic_debt_group} (bad debt). Groups 3-5 are rejected automatically.",
                "This rule applies whatever the model would have scored.",
            ], **common)
    if index in BR1_MANUAL_REVIEW:
        return ScoringResult(
            score=None, label=None, rejected_reason="score_out_of_range", model_version=scoring.MODEL_VERSION,
            explanation=["The model returned an invalid score, so no score is shown."], **common)
    score, reasons = scoring.predict(features)
    label = label_for(score)
    return ScoringResult(
        score=score, label=label, model_version=scoring.MODEL_VERSION, explanation=reasons,
        rejected_reason="score_below_40" if label == ScoreLabel.REJECTED else None, **common)


def seed_database(db) -> dict:
    if db.query(LoanApplication).count() > 0:
        return {}

    users = {}
    for data in USERS:
        user = db.query(User).filter_by(email=data["email"]).one_or_none()
        if user is None:
            user = User(hashed_password=hash_password(TEST_PASSWORD),**data,)
            db.add(user)
        users[data["email"]] = user
    db.flush()

    now = datetime.now(UTC)
    loans = []
    for i, (owner, income, amount, term, payment, purpose, history, cic, status) in enumerate(LOANS):
        created = now - timedelta(days=len(LOANS) - i)
        loan = LoanApplication(
            created_by=users[owner].id,
            monthly_income=income,
            loan_amount=amount,
            loan_term_months=term,
            estimated_monthly_payment=payment,
            purpose=purpose,
            credit_history_note=history,
            cic_debt_group=cic,
            status=status,
            dsr_flag_high_risk=payment * 100 > 50 * income,
            created_at=created,
            updated_at=created,
        )
        db.add(loan)
        loans.append(loan)
    db.flush()

    # created_at is 2 days back, so BR5 (3 scorings per hour) never blocks scoring a seeded loan again.
    for i in sorted(SCORED | BR4_REJECTED | BR1_MANUAL_REVIEW):
        db.add(_scoring_result(loans[i], i, now - timedelta(days=2)))

    db.commit()
    return {"users": len(users), "loan_applications": len(LOANS)}


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        counts = seed_database(db)
    finally:
        db.close()
    if counts:
        print("Seeded: " + ", ".join(f"{name}={n}" for name, n in counts.items()))
    else:
        print("Data already present, skipping seed.")


if __name__ == "__main__":
    main()

