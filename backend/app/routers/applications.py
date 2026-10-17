from datetime import UTC, datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user
from app.models import (
    EventLog,
    LoanApplication,
    LoanStatus,
    ScoreLabel,
    ScoringResult,
    User,
    UserRole,
)
from app.scoring_service import LABEL_TEXT, score_application
from app.transactions import lock_application

router = APIRouter(prefix="/api", tags=["loan-applications"])

LOCAL_TZ = timezone(timedelta(hours=7))


class ApplicationIn(BaseModel):
    monthly_income: int = Field(gt=0, le=10**13)
    loan_amount: int = Field(gt=0, le=10**13)
    loan_term_months: int = Field(gt=0, le=600)
    estimated_monthly_payment: int = Field(gt=0, le=10**13)
    purpose: str | None = Field(default=None, max_length=500)
    credit_history_note: str | None = Field(default=None, max_length=500)
    cic_debt_group: int | None = Field(default=None, ge=1, le=5)


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def _latest(loan: LoanApplication):
    return max(
        loan.scoring_results,
        key=lambda result: (_aware(result.created_at), result.id),
        default=None,
    )


def result_dict(result: ScoringResult) -> dict:
    return {
        "id": result.id,
        "score": result.score,
        "label": result.label.value if result.label else None,
        "label_text": LABEL_TEXT.get(result.label),
        "explanation": result.explanation or [],
        "rejected_reason": result.rejected_reason,
        "model_version": result.model_version,
        "created_at": _aware(result.created_at).isoformat(),
    }


def loan_dict(loan: LoanApplication) -> dict:
    latest = _latest(loan)
    return {
        "id": loan.id,
        "owner_id": loan.created_by,
        "owner_name": loan.created_by_user.full_name if loan.created_by_user else None,
        "monthly_income": loan.monthly_income,
        "loan_amount": loan.loan_amount,
        "loan_term_months": loan.loan_term_months,
        "estimated_monthly_payment": loan.estimated_monthly_payment,
        "dsr_percent": round(loan.estimated_monthly_payment * 100 / loan.monthly_income, 1),
        "purpose": loan.purpose,
        "credit_history_note": loan.credit_history_note,
        "cic_debt_group": loan.cic_debt_group,
        "status": loan.status.value,
        "dsr_flag_high_risk": loan.dsr_flag_high_risk,
        "created_at": loan.created_at.isoformat(),
        "updated_at": loan.updated_at.isoformat(),
        "latest_score": result_dict(latest) if latest else None,
    }


def application_detail(db: Session, loan: LoanApplication) -> dict:
    data = loan_dict(loan)
    audit = (
        db.query(EventLog, User.full_name)
        .outerjoin(User, EventLog.actor_id == User.id)
        .filter(
            EventLog.loan_application_id == loan.id,
            EventLog.action == "loan.approved",
        )
        .order_by(EventLog.created_at.desc(), EventLog.id.desc())
        .first()
    )
    data["approval"] = None if audit is None else {
        "actor_id": audit[0].actor_id,
        "actor_name": audit[1] or "Former manager",
        "approved_at": _aware(audit[0].created_at).isoformat(),
    }
    return data


@router.post("/loan-applications", status_code=201)
def create_application(
    body: ApplicationIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    high_risk = (
        body.estimated_monthly_payment * 100 > 50 * body.monthly_income
    )
    loan = LoanApplication(
        **body.model_dump(),
        created_by=user.id,
        status=LoanStatus.PENDING,
        dsr_flag_high_risk=high_risk,
    )
    try:
        db.add(loan)
        db.flush()
        db.add(
            EventLog(
                actor_id=user.id,
                loan_application_id=loan.id,
                action="loan.created",
                detail="high risk (DSR above 50%)" if high_risk else None,
            )
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(loan)
    return loan_dict(loan)


@router.get("/loan-applications")
def list_applications(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    query = db.query(LoanApplication)
    if user.role != UserRole.ADMIN:
        query = query.filter(LoanApplication.created_by == user.id)
    loans = query.order_by(
        LoanApplication.created_at.desc(), LoanApplication.id
    ).all()
    return [loan_dict(loan) for loan in loans]


def _get_allowed(
    db: Session, user: User, loan_id: str
) -> LoanApplication:
    loan = db.get(LoanApplication, loan_id)
    if loan is None:
        raise HTTPException(
            404,
            "Application not found. Check the link or return to the list.",
        )
    if user.role != UserRole.ADMIN and loan.created_by != user.id:
        raise HTTPException(
            403,
            "You can only open applications you created. "
            "Ask your manager if you need access to this one.",
        )
    return loan


@router.get("/loan-applications/{loan_id}")
def get_application(
    loan_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    return application_detail(db, _get_allowed(db, user, loan_id))


@router.post("/loan-applications/{loan_id}/score", status_code=201)
def score(
    loan_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    loan = _get_allowed(db, user, loan_id)
    result = score_application(db, loan, user)
    db.refresh(loan)
    return {
        "result": result_dict(result),
        "application": loan_dict(loan),
    }


@router.get("/loan-applications/{loan_id}/scores")
def score_history(
    loan_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    loan = _get_allowed(db, user, loan_id)
    results = (
        db.query(ScoringResult)
        .filter(ScoringResult.loan_application_id == loan.id)
        .order_by(ScoringResult.created_at, ScoringResult.id)
        .all()
    )
    return [result_dict(result) for result in results]


@router.get("/dashboard/summary")
def dashboard_summary(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    today = datetime.now(LOCAL_TZ).date()
    start_local = datetime.combine(
        today, datetime.min.time(), tzinfo=LOCAL_TZ
    )
    start_utc = start_local.astimezone(UTC)
    end_utc = (start_local + timedelta(days=1)).astimezone(UTC)
    query = (
        db.query(LoanApplication)
        .options(joinedload(LoanApplication.scoring_results))
        .filter(
            LoanApplication.created_at >= start_utc,
            LoanApplication.created_at < end_utc,
        )
    )
    if user.role != UserRole.ADMIN:
        query = query.filter(LoanApplication.created_by == user.id)
    loans = query.all()
    scores = []
    for loan in loans:
        latest = _latest(loan)
        if latest is not None and latest.score is not None:
            scores.append(latest.score)
    return {
        "date": today.isoformat(),
        "total_applications": len(loans),
        "average_score": round(sum(scores) / len(scores), 1) if scores else None,
        "high_risk_count": sum(1 for loan in loans if loan.dsr_flag_high_risk),
    }


@router.patch("/loan-applications/{loan_id}/approve")
def approve_application(
    loan_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            403,
            "Only a manager can approve a loan application. "
            "Ask your manager to review this application.",
        )
    loan = _get_allowed(db, user, loan_id)
    try:
        lock_application(db, loan)
        if loan.status in (
            LoanStatus.CANCELLED,
            LoanStatus.REJECTED,
            LoanStatus.APPROVED,
        ):
            raise HTTPException(
                409,
                "This application is cancelled, rejected or already approved. "
                "Select an application awaiting approval.",
            )
        latest = _latest(loan)
        if (
            loan.status not in (LoanStatus.SCORED, LoanStatus.MANUAL_REVIEW)
            or latest is None
            or latest.label != ScoreLabel.ELIGIBLE
            or type(latest.score) is not int
            or not 70 <= latest.score <= 100
            or (
                loan.cic_debt_group is not None
                and loan.cic_debt_group >= 3
            )
        ):
            raise HTTPException(
                409,
                "This application needs a valid eligible score before approval. "
                "Review its data and scoring results first.",
            )
        latest_id = (
            db.query(ScoringResult.id)
            .filter(ScoringResult.loan_application_id == loan.id)
            .order_by(ScoringResult.created_at.desc(), ScoringResult.id.desc())
            .limit(1)
            .scalar_subquery()
        )
        updated = (
            db.query(LoanApplication)
            .filter(
                LoanApplication.id == loan.id,
                LoanApplication.status == loan.status,
                latest_id == latest.id,
            )
            .update(
                {
                    LoanApplication.status: LoanStatus.APPROVED,
                    LoanApplication.updated_at: datetime.now(UTC),
                },
                synchronize_session=False,
            )
        )
        if updated != 1:
            raise HTTPException(
                409,
                "This application changed while you were reviewing it. "
                "Reload the details before deciding.",
            )
        db.add(
            EventLog(
                actor_id=user.id,
                loan_application_id=loan.id,
                action="loan.approved",
                detail=(
                    f"Manager approved score {latest.score}; "
                    f"high risk: {loan.dsr_flag_high_risk}"
                ),
            )
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.expire_all()
    return application_detail(db, _get_allowed(db, user, loan_id))
