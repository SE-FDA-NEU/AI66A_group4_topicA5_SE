"""US07: new-application notifications with durable, per-manager read receipts."""
from datetime import UTC
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import (
    EventLog,
    LoanApplication,
    LoanStatus,
    NotificationRead,
    User,
    UserRole,
)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])
REVIEW_STATES = (LoanStatus.PENDING, LoanStatus.SCORED, LoanStatus.MANUAL_REVIEW)


def _manager(user):
    if user.role != UserRole.ADMIN:
        raise HTTPException(403, "Only a manager can open review notifications.")


def _iso(value):
    return (value if value.tzinfo else value.replace(tzinfo=UTC)).isoformat()


@router.get("")
def notifications(db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]):
    _manager(user)
    rows = (
        db.query(EventLog, LoanApplication, User.full_name, NotificationRead.read_at)
        .join(LoanApplication, EventLog.loan_application_id == LoanApplication.id)
        .outerjoin(User, LoanApplication.created_by == User.id)
        .outerjoin(NotificationRead, (NotificationRead.event_log_id == EventLog.id)
                   & (NotificationRead.recipient_id == user.id))
        .filter(EventLog.action == "loan.created", LoanApplication.status.in_(REVIEW_STATES))
        .order_by(EventLog.created_at.desc(), EventLog.id.desc())
        .all()
    )
    items = [{"id": event.id, "loan_application_id": loan.id,
              "owner_name": owner or "Former employee", "status": loan.status.value,
              "created_at": _iso(event.created_at), "is_read": read_at is not None,
              "read_at": _iso(read_at) if read_at else None,
              "message": f"Application #{loan.id[:8]} needs review."}
             for event, loan, owner, read_at in rows]
    return {"unread_count": sum(not item["is_read"] for item in items), "items": items}


@router.patch("/{notification_id}/read")
def mark_read(notification_id: str, db: Annotated[Session, Depends(get_db)],
              user: Annotated[User, Depends(get_current_user)]):
    _manager(user)
    event = db.get(EventLog, notification_id)
    if event is None or event.action != "loan.created" or event.loan_application_id is None:
        raise HTTPException(404, "Notification not found. Refresh the notification list.")
    key = (user.id, event.id)
    receipt = db.get(NotificationRead, key)
    if receipt is None:
        receipt = NotificationRead(recipient_id=user.id, event_log_id=event.id)
        db.add(receipt)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            receipt = db.get(NotificationRead, key)
            if receipt is None:
                raise
    return {"id": event.id, "is_read": True, "read_at": _iso(receipt.read_at)}
