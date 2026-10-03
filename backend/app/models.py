import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    BigInteger,
    CheckConstraint,
    Index,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    false,
)
from sqlalchemy.orm import relationship

from app.database import Base


def now_utc():
    return datetime.now(timezone.utc)


def gen_uuid():
    return str(uuid.uuid4())

def tz_datetime(**kwargs):
    return Column(DateTime(timezone=True), **kwargs)

def str_enum(enum_cls, name):
    return Enum(
        enum_cls,
        name=name,
        native_enum=False,
        length=20,
        values_callable=lambda e: [m.value for m in e],
    )


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

class ScoreLabel(str, enum.Enum):
    REJECTED = "rejected"
    REVIEW = "review"
    ELIGIBLE = "eligible"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(
        str_enum(UserRole, "user_role"),
        nullable=False,
        default=UserRole.USER,
        server_default=UserRole.USER.value,
    )
    failed_login_count = Column(Integer, nullable=False, default=0, server_default="0")
    locked_until = tz_datetime(DateTime, nullable=True)

    created_at = tz_datetime(nullable=False, default=now_utc)

    loan_applications = relationship("LoanApplication", back_populates="created_by_user")


class LoanApplication(Base):
    __tablename__ = "loan_applications"
    __table_args__ = (
        # BR2: declared income must be > 0
        CheckConstraint("monthly_income > 0", name="ck_loan_income_pos"),
        CheckConstraint("loan_amount > 0", name="ck_loan_amount_pos"),
        CheckConstraint("loan_term_months > 0", name="ck_loan_term_pos"),
        # BR4: CIC debt groups are 1..5 when known
        CheckConstraint(
            "cic_debt_group IS NULL OR cic_debt_group BETWEEN 1 AND 5",
            name="ck_loan_cic_group_range",
        ),
        # BR8 listing per user, newest first
        Index("ix_loan_applications_created_by_created_at", "created_by", "created_at"),
    )

    id = Column(String, primary_key=True, default=gen_uuid)
    # BR8: owner of the application. RESTRICT so a user with data cannot be deleted by accident.
    created_by = Column(
        String,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # US03 - money is exact numbers.
    monthly_income = Column(BigInteger, nullable=False)               # BR2
    loan_amount = Column(BigInteger, nullable=False)                  # BR3
    loan_term_months = Column(Integer, nullable=False)                    # BR3
    estimated_monthly_payment = Column(BigInteger, nullable=False)    # BR3 (DSR input)
    credit_history_note = Column(Text, nullable=True)
    purpose = Column(String, nullable=True)

    # BR4: CIC debt group 1..5. Groups 3-5 are auto-rejected by the service layer.
    cic_debt_group = Column(Integer, nullable=True)

    # BR7: ciphertext only, key comes from an environment variable.
    # Plain text is never written to the DB or to logs.
    citizen_id_encrypted = Column(String, nullable=True)
    # BR7: last 4 digits only, so the UI can show "*******7890" without decrypting.
    citizen_id_last4 = Column(String(4), nullable=True)

    status = Column(
        str_enum(LoanStatus, "loan_status"),
        nullable=False,
        default=LoanStatus.PENDING,
        server_default=LoanStatus.PENDING.value,
        index=True,
    )
    # BR3: DSR > 50% -> flagged "High risk" at creation, regardless of model score.
    dsr_flag_high_risk = Column(
        Boolean, nullable=False, default=False, server_default=false()
    )

    # US08: daily dashboard filters on created_at
    created_at = tz_datetime(nullable=False, default=now_utc, index=True)
    updated_at = tz_datetime(nullable=False, default=now_utc, onupdate=now_utc)

    created_by_user = relationship("User", back_populates="loan_applications")
    scoring_results = relationship(
        "ScoringResult",
        back_populates="loan_application",
        order_by="ScoringResult.created_at",
    )


class ScoringResult(Base):
    __tablename__ = "scoring_results"
    __table_args__ = (
        # BR1: a valid score is an integer in [0, 100].
        CheckConstraint(
            "score IS NULL OR score BETWEEN 0 AND 100", name="ck_scoring_score_range"
        ),
        # BR5: count scorings of one application within the last hour.
        # US06: history tab lists them by time.
        Index("ix_scoring_results_app_created", "loan_application_id", "created_at"),
    )

    id = Column(String, primary_key=True, default=gen_uuid)
    loan_application_id = Column(
        String,
        ForeignKey("loan_applications.id", ondelete="RESTRICT"),
        nullable=False,
    )

    score = Column(Integer, nullable=True)                                # BR1, US04
    label = Column(str_enum(ScoreLabel, "score_label"), nullable=True)    # BR6
    # US04: list of key factors.
    # A score < 40 must carry at least 2 reasons.
    explanation = Column(JSON, nullable=True)
    # BR1 / BR3 / BR4 / BR5: why the result was blocked, rejected or flagged.
    rejected_reason = Column(String, nullable=True)

    # Traceability for the "output consistency" requirement.
    model_version = Column(String, nullable=True)
    input_snapshot = Column(JSON, nullable=True)

    created_at = tz_datetime(nullable=False, default=now_utc)

    loan_application = relationship(
        "LoanApplication", back_populates="scoring_results"
    )


class EventLog(Base):
    __tablename__ = "event_logs"

    id = Column(String, primary_key=True, default=gen_uuid)
    # Audit rows must outlive the rows they refer to: SET NULL, never CASCADE.
    actor_id = Column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    loan_application_id = Column(
        String,
        ForeignKey("loan_applications.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action = Column(String, nullable=False)
    detail = Column(Text, nullable=True)
    created_at = tz_datetime(nullable=False, default=now_utc, index=True)
