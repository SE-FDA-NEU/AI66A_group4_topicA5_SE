from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app import scoring
from app.transactions import lock_application
from app.models import EventLog, LoanApplication, LoanStatus, ScoreLabel, ScoringResult, User

MAX_SCORINGS_PER_HOUR = 3

LABEL_TEXT = {
    ScoreLabel.REJECTED: "Proposal rejected",
    ScoreLabel.REVIEW: "Requires further review",
    ScoreLabel.ELIGIBLE: "Eligible for proposal",
}


def label_for(score: int) -> ScoreLabel:  # BR6
    if score < 40:
        return ScoreLabel.REJECTED
    if score < 70:
        return ScoreLabel.REVIEW
    return ScoreLabel.ELIGIBLE


def _log(db: Session, user: User, loan: LoanApplication, action: str, detail: str):
    db.add(EventLog(actor_id=user.id, loan_application_id=loan.id, action=action, detail=detail))


def score_application(db: Session, loan: LoanApplication, user: User) -> ScoringResult:
    lock_application(db, loan)
    if loan.status in (LoanStatus.CANCELLED, LoanStatus.APPROVED):
        raise HTTPException(409, "This application is cancelled or already approved, so it cannot be scored again. Go back to the list or ask your manager for help.")

    features = scoring.build_features(loan)
    snapshot = {k: v for k, v in features.items()}

    # BR5: at most 3 scorings per application in one hour; the 4th is blocked and flagged.
    since = datetime.now(timezone.utc) - timedelta(hours=1)
    recent = (
        db.query(ScoringResult)
        .filter(ScoringResult.loan_application_id == loan.id, ScoringResult.created_at >= since)
        .count()
    )
    if recent >= MAX_SCORINGS_PER_HOUR:
        loan.status = LoanStatus.MANUAL_REVIEW
        _log(db, user, loan, "loan.score_blocked", "BR5: more than 3 scorings in one hour")
        db.commit()
        raise HTTPException(
            429,
            "This application has already been scored 3 times in the last hour. "
            "It is now marked 'Requires manager review'. Ask a manager to review it.",
        )

    # BR4: CIC groups 3-5 are rejected, the model is not called.
    if loan.cic_debt_group is not None and loan.cic_debt_group >= 3:
        result = ScoringResult(
            loan_application_id=loan.id, score=None, label=ScoreLabel.REJECTED,
            rejected_reason="cic_bad_debt_group", model_version=None, input_snapshot=snapshot,
            explanation=[
                f"CIC debt group {loan.cic_debt_group} (bad debt). Groups 3-5 are rejected automatically.",
                "This rule applies whatever the model would have scored.",
            ],
        )
        loan.status = LoanStatus.REJECTED
        db.add(result)
        _log(db, user, loan, "loan.scored", f"rejected by BR4, CIC group {loan.cic_debt_group}")
        db.commit()
        return result

    raw_score, reasons = scoring.predict(features)

    # BR1: an out-of-range score is never shown; the application goes to manual review.
    if type(raw_score) is not int or not 0 <= raw_score <= 100:
        result = ScoringResult(
            loan_application_id=loan.id, score=None, label=None, rejected_reason="score_out_of_range",
            model_version=scoring.MODEL_VERSION, input_snapshot=snapshot,
            explanation=["The model returned an invalid score, so no score is shown."],
        )
        loan.status = LoanStatus.MANUAL_REVIEW
        db.add(result)
        _log(db, user, loan, "loan.score_blocked", "BR1: invalid model score")
        db.commit()
        return result

    label = label_for(raw_score)  # BR6
    result = ScoringResult(
        loan_application_id=loan.id, score=raw_score, label=label, model_version=scoring.MODEL_VERSION,
        input_snapshot=snapshot, explanation=reasons,
        rejected_reason="score_below_40" if label == ScoreLabel.REJECTED else None,
    )
    loan.status = LoanStatus.REJECTED if label == ScoreLabel.REJECTED else LoanStatus.SCORED
    db.add(result)
    _log(db, user, loan, "loan.scored", f"score {raw_score} ({label.value})")
    db.commit()
    return result
