from app.models import LoanApplication, LoanStatus, User, UserRole
from app.seed import seed_database


def _user(db):
    user = User(email="t@branch.vn", hashed_password="!", full_name="Test User", role=UserRole.USER)
    db.add(user)
    db.commit()
    return user


def _loan(db, user, **overrides):
    data = dict(
        created_by=user.id,
        monthly_income=10_000_000,
        loan_amount=50_000_000,
        loan_term_months=12,
        estimated_monthly_payment=2_000_000,
        purpose="Test",
        status=LoanStatus.PENDING,
    )
    data.update(overrides)
    db.add(LoanApplication(**data))
    db.commit()


def test_health_check(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_route_returns_html_page_with_seeded_rows(client, db_session):
    seed_database(db_session)

    resp = client.get("/loan-applications")

    assert resp.status_code == 200
    assert "text/html" in resp.headers["content-type"]
    assert "Loan applications (12)" in resp.text
    assert resp.text.count('class="loan-row"') == 12  


def test_route_reads_the_database_not_a_hardcoded_list(client, db_session):
    """Add one row to the database, call the route again: exactly one more row appears."""
    user = _user(db_session)
    for i in range(15):
        _loan(db_session, user, purpose=f"Test {i}")

    before = client.get("/loan-applications").text.count('class="loan-row"')
    _loan(db_session, user, purpose="MARKER_ROW")
    resp = client.get("/loan-applications")

    assert before == 15
    assert resp.text.count('class="loan-row"') == before + 1
    assert "MARKER_ROW" in resp.text


def test_route_shows_empty_state(client):
    resp = client.get("/loan-applications")

    assert resp.status_code == 200
    assert "Loan applications (0)" in resp.text
    assert "No loan applications yet." in resp.text
    assert 'class="loan-row"' not in resp.text


def test_route_escapes_user_supplied_text(client, db_session):
    """Stored text must never be rendered as HTML (XSS)."""
    user = _user(db_session)
    _loan(db_session, user, purpose="<script>alert(1)</script>")

    resp = client.get("/loan-applications")

    assert "<script>alert(1)</script>" not in resp.text
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in resp.text


def test_seed_flags_high_risk_according_to_br3(client, db_session):
    """BR3: DSR above 50% -> flagged 'High risk'. Exactly 50% is allowed."""
    seed_database(db_session)

    loans = db_session.query(LoanApplication).all()
    for loan in loans:
        too_high = loan.estimated_monthly_payment * 100 > 50 * loan.monthly_income
        assert loan.dsr_flag_high_risk is too_high, loan.purpose

    flagged = sum(1 for loan in loans if loan.dsr_flag_high_risk)
    assert flagged == 3
    assert client.get("/loan-applications").text.count('class="high-risk"') == flagged


def test_seed_is_idempotent(db_session):
    assert seed_database(db_session) == {"users": 3, "loan_applications": 12}
    assert seed_database(db_session) == {}
    assert db_session.query(LoanApplication).count() == 12
