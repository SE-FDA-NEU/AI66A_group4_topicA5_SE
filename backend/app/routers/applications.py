from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import EventLog, LoanApplication, LoanStatus, User

router = APIRouter(prefix="/api", tags=["loan-applications"])


class ApplicationIn(BaseModel):
    monthly_income: int = Field(gt=0, le=10**13)
    loan_amount: int = Field(gt=0, le=10**13)
    loan_term_months: int = Field(gt=0, le=600)
    estimated_monthly_payment: int = Field(gt=0, le=10**13)
    purpose: str | None = Field(default=None, max_length=500)
    credit_history_note: str | None = Field(default=None, max_length=500)
    cic_debt_group: int | None = Field(default=None, ge=1, le=5)


@router.post("/loan-applications", status_code=201)
def create_application(
    body: ApplicationIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
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
    return {
        "id": loan.id,
        "owner_id": loan.created_by,
        "monthly_income": loan.monthly_income,
        "loan_amount": loan.loan_amount,
        "loan_term_months": loan.loan_term_months,
        "estimated_monthly_payment": loan.estimated_monthly_payment,
        "purpose": loan.purpose,
        "credit_history_note": loan.credit_history_note,
        "cic_debt_group": loan.cic_debt_group,
        "status": loan.status.value,
        "dsr_flag_high_risk": loan.dsr_flag_high_risk,
        "created_at": loan.created_at.isoformat(),
        "updated_at": loan.updated_at.isoformat(),
    }
