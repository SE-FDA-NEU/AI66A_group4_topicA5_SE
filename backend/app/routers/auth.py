from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import _bearer, get_current_user
from app.models import RevokedToken, User
from app.security import create_access_token, token_fingerprint, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

MAX_FAILED_LOGINS = 3
LOCK_MINUTES = 15


class LoginIn(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)

    @field_validator("email", "password")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        # The 422 handler turns a blank value on a required field into "<label> is required."
        if not value.strip():
            raise ValueError("A value is required.")
        return value


def user_dict(user: User) -> dict:
    return {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role.value, "is_active": user.is_active}


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)


@router.post("/login")
def login(body: LoginIn, db: Annotated[Session, Depends(get_db)]):
    now = datetime.now(UTC)
    user = db.query(User).filter(User.email == body.email.strip().lower()).one_or_none()

    if user is not None and not user.is_active:
        raise HTTPException(403, "This employee account is inactive. Ask your manager to reactivate it.")

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
    return {"access_token": create_access_token(user.id, user.role.value, user.token_version), "token_type": "bearer", "user": user_dict(user)}


@router.get("/me")
def me(user: Annotated[User, Depends(get_current_user)]):
    return user_dict(user)


@router.post("/logout", status_code=204)
def logout(db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)],
           credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]):
    fingerprint = token_fingerprint(credentials.credentials)
    db.add(RevokedToken(token_hash=fingerprint, user_id=user.id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if db.get(RevokedToken, fingerprint) is None:
            raise
    return Response(status_code=204)
