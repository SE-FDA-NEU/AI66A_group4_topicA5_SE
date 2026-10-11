from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

MAX_FAILED_LOGINS = 3
LOCK_MINUTES = 15


class LoginIn(BaseModel):
    email: str
    password: str


def user_dict(user: User) -> dict:
    return {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role.value}


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    user = db.query(User).filter(User.email == body.email.strip().lower()).one_or_none()

    # US01: after 3 wrong passwords in a row, the account is locked for 15 minutes.
    if user and user.locked_until and _aware(user.locked_until) > now:
        raise HTTPException(
            423,
            f"Too many wrong passwords. Your account is locked for {LOCK_MINUTES} minutes. "
            "Try again later or ask your manager to help.",
        )

    if user is None or not verify_password(body.password, user.hashed_password):
        if user:
            user.failed_login_count += 1
            if user.failed_login_count >= MAX_FAILED_LOGINS:
                user.locked_until = now + timedelta(minutes=LOCK_MINUTES)
                user.failed_login_count = 0
            db.commit()
        raise HTTPException(401, "Email or password is incorrect. Check your details and try again.")

    user.failed_login_count = 0
    user.locked_until = None
    db.commit()
    return {"access_token": create_access_token(user.id, user.role.value), "token_type": "bearer", "user": user_dict(user)}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return user_dict(user)
