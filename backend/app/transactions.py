"""Serialize decisions on one loan in the database, across worker processes."""
from sqlalchemy import update

from app.models import LoanApplication


def lock_application(db, loan):
    # SQLite ignores SELECT FOR UPDATE. A no-op UPDATE acquires its writer lock;
    # PostgreSQL acquires a row lock. Hold until score/approval commits or rolls back.
    db.execute(update(LoanApplication).where(LoanApplication.id == loan.id)
               .values(updated_at=LoanApplication.updated_at)
               .execution_options(synchronize_session=False))
    db.refresh(loan)
    db.expire(loan, ['scoring_results'])