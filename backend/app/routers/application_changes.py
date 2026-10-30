"""US10: validate and serialize edits/cancellation before a loan is processed."""
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.exceptions import RequestValidationError
from pydantic import Field, ValidationError, field_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import EventLog, LoanStatus, ScoringResult, User
from app.privacy import encrypt_identifier
from app.routers.applications import ApplicationIn, _get_allowed, application_detail
from app.transactions import lock_application

router = APIRouter(prefix="/api/loan-applications", tags=["application-changes"])
IDENTIFIERS = ("citizen_id", "bank_account")


class ApplicationPatch(ApplicationIn):
    # Omitted fields remain unchanged. Explicit null required values are rejected
    # by validating the complete merged ApplicationIn under the same DB lock.
    monthly_income: int | None = Field(default=None, gt=0, le=10**13)
    loan_amount: int | None = Field(default=None, gt=0, le=10**13)
    loan_term_months: int | None = Field(default=None, gt=0, le=600)
    estimated_monthly_payment: int | None = Field(default=None, gt=0, le=10**13)

    @field_validator("estimated_monthly_payment")
    @classmethod
    def _br9_payment_must_cover_loan(cls, value):
        # Override the inherited cross-field check: partial input must be merged
        # with the locked persisted values before applying BR9, including nulls.
        return value


def _unprocessed(db, loan, action):
    has_result = db.query(ScoringResult.id).filter_by(loan_application_id=loan.id).first() is not None
    if loan.status != LoanStatus.PENDING or has_result:
        message = "Application already processed, cannot be edited" if action == "edit" else (
            "Application already processed, cannot be cancelled."
        )
        raise HTTPException(409, message)


@router.patch("/{loan_id}")
def edit_application(loan_id: str, body: ApplicationPatch,
                     db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]):
    loan = _get_allowed(db, user, loan_id)
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(422, "No editable fields were provided. Change a field and try again.")
    try:
        lock_application(db, loan)
        _unprocessed(db, loan, "edit")
        # Existing protected identifiers need not be decrypted to edit other data.
        merged = {name: None if name in IDENTIFIERS else getattr(loan, name)
                  for name in ApplicationIn.model_fields}
        merged.update(changes)
        try:
            values = ApplicationIn.model_validate(merged).model_dump()
        except ValidationError as error:
            raise RequestValidationError([
                {**item, "loc": ("body", *item["loc"])} for item in error.errors()
            ]) from error
        for name in changes:
            if name in IDENTIFIERS:
                encrypted, suffix = encrypt_identifier(values[name])
                setattr(loan, f"{name}_encrypted", encrypted)
                setattr(loan, f"{name}_last4", suffix)
            else:
                setattr(loan, name, values[name])
        loan.dsr_flag_high_risk = values["estimated_monthly_payment"] * 100 > values["monthly_income"] * 50
        loan.updated_at = datetime.now(UTC)
        db.add(EventLog(actor_id=user.id, loan_application_id=loan.id, action="loan.edited",
                        detail="Updated fields: " + ", ".join(sorted(changes))))
        db.commit()
    except Exception:
        db.rollback()
        raise
    return application_detail(db, loan)


@router.patch("/{loan_id}/cancel")
def cancel_application(loan_id: str, db: Annotated[Session, Depends(get_db)],
                       user: Annotated[User, Depends(get_current_user)]):
    loan = _get_allowed(db, user, loan_id)
    try:
        lock_application(db, loan)
        if loan.status == LoanStatus.CANCELLED:
            db.rollback()
            return application_detail(db, loan)
        _unprocessed(db, loan, "cancel")
        loan.status = LoanStatus.CANCELLED
        loan.updated_at = datetime.now(UTC)
        db.add(EventLog(actor_id=user.id, loan_application_id=loan.id,
                        action="loan.cancelled", detail="Unprocessed application cancelled."))
        db.commit()
    except Exception:
        db.rollback()
        raise
    return application_detail(db, loan)
