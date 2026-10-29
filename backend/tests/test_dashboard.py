"""US08 daily summaries use persisted data, role scope and Vietnam-day boundaries."""
from datetime import UTC, datetime, timedelta

import pytest

from app.models import LoanApplication, ScoringResult, User, UserRole
from app.routers import applications
from app.security import hash_password
from app.seed import TEST_PASSWORD
from tests.conftest import VALID_APPLICATION

NOW = datetime(2026, 10, 25, 5, 0, tzinfo=UTC)
DAY_START = datetime(2026, 10, 24, 17, 0, tzinfo=UTC)
DAY_END = DAY_START + timedelta(days=1)
SUMMARY = "/api/dashboard/summary"


@pytest.fixture
def frozen_day(monkeypatch):
    class Clock(datetime):
        @classmethod
        def now(cls, tz=None):
            return NOW.astimezone(tz) if tz is not None else NOW.replace(tzinfo=None)

    monkeypatch.setattr(applications, "datetime", Clock)


@pytest.fixture
def accounts(db_session):
    # A single real password hash avoids three repeated setup hashes per case.
    hashed = hash_password(TEST_PASSWORD)
    users = {
        name: User(email=f"{name}@branch.vn", full_name=name.title(),
                   hashed_password=hashed, role=role)
        for name, role in (("hoang", UserRole.USER), ("linh", UserRole.USER),
                           ("thanh", UserRole.ADMIN))
    }
    db_session.add_all(users.values())
    db_session.commit()
    return users


def _loan(db, owner, *, created_at=NOW, high_risk=False):
    values = {**VALID_APPLICATION,
              "estimated_monthly_payment": 15_000_000 if high_risk else 5_000_000}
    loan = LoanApplication(created_by=owner.id, created_at=created_at,
                           dsr_flag_high_risk=high_risk, **values)
    db.add(loan)
    db.flush()
    return loan


def _score(db, loan, value, *, created_at=NOW):
    db.add(ScoringResult(loan_application_id=loan.id, score=value,
                         created_at=created_at))


# TC-US08-04
def test_dashboard_counts_ten_applications_and_exact_average(client, db_session, login, accounts, frozen_day):
    for number in range(1, 11):
        loan = _loan(db_session, accounts["hoang"], high_risk=number <= 3)
        _score(db_session, loan, number * 10)
    db_session.commit()

    response = client.get(SUMMARY, headers=login("hoang@branch.vn"))
    assert response.status_code == 200
    assert response.json() == {"date": "2026-10-25", "total_applications": 10,
                               "average_score": 55.0, "high_risk_count": 3}


# TC-US08-05
def test_dashboard_averages_only_latest_non_null_score_per_application(client, db_session, login, accounts, frozen_day):
    changed = _loan(db_session, accounts["hoang"])
    _score(db_session, changed, 20, created_at=NOW - timedelta(minutes=20))
    _score(db_session, changed, 80)
    invalidated = _loan(db_session, accounts["hoang"])
    _score(db_session, invalidated, 100, created_at=NOW - timedelta(minutes=20))
    _score(db_session, invalidated, None)
    _score(db_session, _loan(db_session, accounts["hoang"]), 60)
    _loan(db_session, accounts["hoang"])  # unscored loans still count as applications
    db_session.commit()

    response = client.get(SUMMARY, headers=login("hoang@branch.vn"))
    assert response.status_code == 200
    assert response.json() == {"date": "2026-10-25", "total_applications": 4,
                               "average_score": 70.0, "high_risk_count": 0}


# TC-US08-06
def test_dashboard_scopes_count_average_and_risk_by_officer_and_manager(client, db_session, login, accounts, frozen_day):
    _score(db_session, _loan(db_session, accounts["hoang"], high_risk=True), 20)
    _score(db_session, _loan(db_session, accounts["hoang"]), 40)
    _score(db_session, _loan(db_session, accounts["linh"], high_risk=True), 100)
    db_session.commit()

    for email, total, average, risks in (("hoang@branch.vn", 2, 30.0, 1),
                                        ("linh@branch.vn", 1, 100.0, 1),
                                        ("thanh@branch.vn", 3, 53.3, 2)):
        response = client.get(SUMMARY, headers=login(email))
        assert response.status_code == 200
        assert response.json() == {"date": "2026-10-25", "total_applications": total,
                                   "average_score": average, "high_risk_count": risks}


@pytest.mark.parametrize("created_at,count", [
    (DAY_START - timedelta(microseconds=1), 0),
    (DAY_START, 1),
    (DAY_START + timedelta(microseconds=1), 1),
    (DAY_END - timedelta(microseconds=1), 1),
    (DAY_END, 0),
    (DAY_END + timedelta(microseconds=1), 0),
], ids=["before-midnight", "at-midnight", "after-midnight",
        "before-next-midnight", "at-next-midnight", "after-next-midnight"])
# TC-US08-07
def test_dashboard_vietnam_day_includes_start_and_excludes_end(client, db_session, login, accounts, frozen_day, created_at, count):
    loan = _loan(db_session, accounts["hoang"], created_at=created_at, high_risk=True)
    _score(db_session, loan, 80)
    db_session.commit()

    response = client.get(SUMMARY, headers=login("hoang@branch.vn"))
    assert response.status_code == 200
    assert response.json() == {"date": "2026-10-25", "total_applications": count,
                               "average_score": 80.0 if count else None,
                               "high_risk_count": count}
