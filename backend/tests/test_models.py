
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.models import (
    EventLog,
    LoanApplication,
    LoanStatus,
    ScoringResult,
    User,
    UserRole,
)


@pytest.fixture
def owner(db_session):
    user = User(email="owner@branch.vn", hashed_password="!", full_name="Owner")
    db_session.add(user)
    db_session.commit()
    return user


def make_loan(owner, **overrides):
    data = dict(
        created_by=owner.id,
        monthly_income=10_000_000,
        loan_amount=50_000_000,
        loan_term_months=12,
        estimated_monthly_payment=2_000_000,
    )
    data.update(overrides)
    return LoanApplication(**data)


def test_new_rows_get_safe_defaults(db_session, owner):
    loan = make_loan(owner)
    db_session.add(loan)
    db_session.commit()

    assert owner.role == UserRole.USER
    assert owner.failed_login_count == 0
    assert loan.status == LoanStatus.PENDING
    assert loan.dsr_flag_high_risk is False
    assert loan.created_at is not None


def test_enums_are_stored_by_value(db_session, owner):
    db_session.add(make_loan(owner))
    db_session.commit()

    assert db_session.execute(text("select role from users")).scalar() == "user"
    assert db_session.execute(text("select status from loan_applications")).scalar() == "pending"


@pytest.mark.parametrize("bad_income", [0, -1])
def test_br2_income_must_be_positive(db_session, owner, bad_income):
    db_session.add(make_loan(owner, monthly_income=bad_income))
    with pytest.raises(IntegrityError):
        db_session.commit()


@pytest.mark.parametrize("bad_group", [0, 6])
def test_br4_cic_group_must_be_1_to_5(db_session, owner, bad_group):
    db_session.add(make_loan(owner, cic_debt_group=bad_group))
    with pytest.raises(IntegrityError):
        db_session.commit()


@pytest.mark.parametrize("bad_score", [-1, 101, 132])
def test_br1_score_must_be_0_to_100(db_session, owner, bad_score):
    loan = make_loan(owner)
    db_session.add(loan)
    db_session.commit()
    db_session.add(ScoringResult(loan_application_id=loan.id, score=bad_score))
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_a_blocked_result_may_have_no_score(db_session, owner):
    loan = make_loan(owner)
    db_session.add(loan)
    db_session.commit()
    db_session.add(ScoringResult(loan_application_id=loan.id, score=None, rejected_reason="cic_bad_debt_group"))
    db_session.commit()  # must not raise


def test_every_application_needs_an_owner_br8(db_session):
    db_session.add(
        LoanApplication(monthly_income=1, loan_amount=1, loan_term_months=1, estimated_monthly_payment=0)
    )
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_cannot_delete_a_user_who_owns_applications(db_session, owner):
    db_session.add(make_loan(owner))
    db_session.commit()
    with pytest.raises(IntegrityError):  # ON DELETE RESTRICT
        db_session.execute(text("delete from users"))
        db_session.commit()


def test_scoring_history_is_ordered_by_time_us06(db_session, owner):
    loan = make_loan(owner)
    db_session.add(loan)
    db_session.commit()
    now = datetime.now(timezone.utc)
    db_session.add_all(
        [
            ScoringResult(loan_application_id=loan.id, score=74, created_at=now),
            ScoringResult(loan_application_id=loan.id, score=70, created_at=now - timedelta(days=1)),
        ]
    )
    db_session.commit()
    db_session.refresh(loan)

    assert [r.score for r in loan.scoring_results] == [70, 74]


def test_audit_log_survives_deleting_the_application(db_session, owner):
    loan = make_loan(owner)
    db_session.add(loan)
    db_session.commit()
    db_session.add(EventLog(actor_id=owner.id, loan_application_id=loan.id, action="loan.created"))
    db_session.commit()

    db_session.execute(text("delete from loan_applications"))
    db_session.commit()

    log = db_session.query(EventLog).one()
    assert log.loan_application_id is None  # SET NULL: the audit row is kept
