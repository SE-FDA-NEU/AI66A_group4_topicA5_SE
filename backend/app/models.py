import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


def now_utc():
    return datetime.now(timezone.utc)


def gen_uuid():
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"


class LoanStatus(str, enum.Enum):
    PENDING = "pending"
    SCORED = "scored"
    MANUAL_REVIEW = "manual_review"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    APPROVED = "approved"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.USER)

    failed_login_count = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=now_utc)

    loan_applications = relationship("LoanApplication", back_populates="created_by_user")


class LoanApplication(Base):
    __tablename__ = "loan_applications"

    id = Column(String, primary_key=True, default=gen_uuid)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)

    # US03
    monthly_income = Column(Float, nullable=False)          # BR2
    loan_amount = Column(Float, nullable=False)              # BR3
    loan_term_months = Column(Integer, nullable=False)       # BR3
    estimated_monthly_payment = Column(Float, nullable=False)  # BR3
    credit_history_note = Column(Text, nullable=True)
    purpose = Column(String, nullable=True)

    # BR4
    cic_debt_group = Column(Integer, nullable=True)

    # BR7
    citizen_id_encrypted = Column(String, nullable=True)

    status = Column(Enum(LoanStatus), nullable=False, default=LoanStatus.PENDING)
    dsr_flag_high_risk = Column(Boolean, default=False)      # BR3

    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)

    created_by_user = relationship("User", back_populates="loan_applications")
    scoring_results = relationship(
        "ScoringResult", back_populates="loan_application", order_by="ScoringResult.created_at"
    )


class ScoringResult(Base):
    __tablename__ = "scoring_results"

    id = Column(String, primary_key=True, default=gen_uuid)
    loan_application_id = Column(String, ForeignKey("loan_applications.id"), nullable=False)

    score = Column(Integer, nullable=True)
    label = Column(String, nullable=True)
    explanation = Column(Text, nullable=True)
    rejected_reason = Column(String, nullable=True)

    created_at = Column(DateTime, default=now_utc)

    loan_application = relationship("LoanApplication", back_populates="scoring_results")


class EventLog(Base):
    __tablename__ = "event_logs"

    id = Column(String, primary_key=True, default=gen_uuid)
    actor_id = Column(String, ForeignKey("users.id"), nullable=True)
    loan_application_id = Column(String, ForeignKey("loan_applications.id"), nullable=True)
    action = Column(String, nullable=False)
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime, default=now_utc)
