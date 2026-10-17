"""BR7: identifiers are encrypted at rest, masked in ordinary responses, and
every lookup of a full number is audited. Tests read the raw column, so they
fail if a future change stores plain text."""
import pytest
from sqlalchemy import text

from app import privacy, scoring
from app.models import EventLog
from tests.conftest import VALID_APPLICATION

CITIZEN_ID = "001234567890"   # leading zeros on purpose
BANK_ACCOUNT = "01234567890123"


def _create(client, headers, **overrides):
    body = {**VALID_APPLICATION, **overrides}
    resp = client.post("/api/loan-applications", headers=headers, json=body)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _raw(db, loan_id):
    """The columns exactly as the database holds them."""
    row = db.execute(
        text(
            "SELECT citizen_id_encrypted, citizen_id_last4,"
            " bank_account_encrypted, bank_account_last4"
            " FROM loan_applications WHERE id = :id"
        ),
        {"id": loan_id},
    ).one()
    return dict(zip(
        ("citizen_cipher", "citizen_last4", "bank_cipher", "bank_last4"), row
    ))


# --- encryption at rest -------------------------------------------------

def test_database_holds_ciphertext_not_the_number(client, seeded, login, db_session):
    created = _create(
        client, login("hoang@branch.vn"),
        citizen_id=CITIZEN_ID, bank_account=BANK_ACCOUNT,
    )
    raw = _raw(db_session, created["id"])

    assert raw["citizen_cipher"] not in (None, "", CITIZEN_ID)
    assert CITIZEN_ID not in raw["citizen_cipher"]
    assert BANK_ACCOUNT not in raw["bank_cipher"]
    assert raw["citizen_cipher"].startswith("gAAAA")  # Fernet token
    assert raw["citizen_last4"] == "7890" and raw["bank_last4"] == "0123"


def test_leading_zeros_survive_the_round_trip(client, seeded, login, db_session):
    created = _create(client, login("hoang@branch.vn"), citizen_id=CITIZEN_ID)
    raw = _raw(db_session, created["id"])
    assert privacy.decrypt_identifier(raw["citizen_cipher"]) == CITIZEN_ID


def test_ciphertext_differs_between_two_applications(client, seeded, login, db_session):
    """Fernet uses a random IV, so the same number must not produce the same
    token: otherwise equal ciphertext would reveal equal customers."""
    headers = login("hoang@branch.vn")
    first = _raw(db_session, _create(client, headers, citizen_id=CITIZEN_ID)["id"])
    second = _raw(db_session, _create(client, headers, citizen_id=CITIZEN_ID)["id"])
    assert first["citizen_cipher"] != second["citizen_cipher"]


def test_identifiers_are_optional(client, seeded, login, db_session):
    created = _create(client, login("hoang@branch.vn"))
    raw = _raw(db_session, created["id"])
    assert set(raw.values()) == {None}
    assert created["citizen_id_masked"] is None
    assert created["bank_account_masked"] is None


@pytest.mark.parametrize("blank", ["", "   ", None])
def test_blank_identifier_is_treated_as_not_provided(client, seeded, login, blank):
    created = _create(client, login("hoang@branch.vn"), citizen_id=blank)
    assert created["citizen_id_masked"] is None


# --- masking on ordinary APIs -------------------------------------------

def test_ordinary_responses_show_only_the_mask(client, seeded, login):
    headers = login("hoang@branch.vn")
    created = _create(
        client, headers, citizen_id=CITIZEN_ID, bank_account=BANK_ACCOUNT
    )
    assert created["citizen_id_masked"] == "********7890"
    assert created["bank_account_masked"] == "********0123"

    for path in ("/api/loan-applications", f"/api/loan-applications/{created['id']}"):
        body = client.get(path, headers=headers).text
        assert CITIZEN_ID not in body and BANK_ACCOUNT not in body
        assert "gAAAA" not in body          # no ciphertext either
        assert "encrypted" not in body      # no column leaked by name
        assert "********7890" in body


def test_walking_skeleton_page_does_not_leak_identifiers(client, seeded, login):
    headers = login("hoang@branch.vn")
    _create(client, headers, citizen_id=CITIZEN_ID, bank_account=BANK_ACCOUNT)
    page = client.get("/loan-applications", headers=headers).text
    assert CITIZEN_ID not in page and BANK_ACCOUNT not in page and "gAAAA" not in page


# --- validation ---------------------------------------------------------

@pytest.mark.parametrize("value", [
    "12345678",        # 8 digits: neither 9 nor 12
    "0012345678",      # 10 digits
    "00123456789a",    # a letter
    "0012 3456 7890",  # spaces
    "١٢٣٤٥٦٧٨٩",        # digits from another script
    "9" * 33,          # over max_length
])
def test_invalid_citizen_id_is_422_and_nothing_is_saved(client, seeded, login, value, db_session):
    headers = login("hoang@branch.vn")
    before = client.get("/api/loan-applications", headers=headers).json()
    resp = client.post(
        "/api/loan-applications", headers=headers,
        json={**VALID_APPLICATION, "citizen_id": value},
    )
    assert resp.status_code == 422
    assert "citizen_id" in resp.json()["errors"]
    after = client.get("/api/loan-applications", headers=headers).json()
    assert len(after) == len(before)


def test_citizen_id_error_names_the_rule(client, seeded, login):
    resp = client.post(
        "/api/loan-applications", headers=login("hoang@branch.vn"),
        json={**VALID_APPLICATION, "citizen_id": "123"},
    )
    assert resp.json()["errors"]["citizen_id"] == (
        "Citizen ID must be 9 or 12 digits, with no spaces, letters or separators."
    )


@pytest.mark.parametrize("value", ["12345", "9" * 21])
def test_bank_account_length_is_enforced(client, seeded, login, value):
    resp = client.post(
        "/api/loan-applications", headers=login("hoang@branch.vn"),
        json={**VALID_APPLICATION, "bank_account": value},
    )
    assert resp.status_code == 422
    assert "bank_account" in resp.json()["errors"]


@pytest.mark.parametrize("value", ["123456789", "001234567890"])
def test_nine_and_twelve_digit_citizen_ids_are_accepted(client, seeded, login, value):
    created = _create(client, login("hoang@branch.vn"), citizen_id=value)
    assert created["citizen_id_masked"] == f"********{value[-4:]}"


# --- audited reveal -----------------------------------------------------

@pytest.mark.parametrize("identifiers", [
    {"citizen_id": CITIZEN_ID},
    {"bank_account": BANK_ACCOUNT},
    {"citizen_id": CITIZEN_ID, "bank_account": BANK_ACCOUNT},
])
def test_owner_can_reveal_and_the_lookup_is_logged(client, seeded, login, db_session, identifiers):
    headers = login("hoang@branch.vn")
    created = _create(client, headers, **identifiers)
    resp = client.post(
        f"/api/loan-applications/{created['id']}/sensitive-data/reveal",
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json() == {"citizen_id": None, "bank_account": None, **identifiers}

    events = (
        db_session.query(EventLog)
        .filter(EventLog.loan_application_id == created["id"],
                EventLog.action.in_(("citizen_id.viewed", "bank_account.viewed")))
        .all()
    )
    assert len(events) == len(identifiers)
    assert {event.action: event.detail for event in events} == {
        f"{field}.viewed": f"********{value[-4:]}"
        for field, value in identifiers.items()
    }
    assert all(event.actor_id == created["owner_id"] for event in events)
    assert all(CITIZEN_ID not in event.detail and BANK_ACCOUNT not in event.detail
               for event in events)


def test_creation_audit_detail_is_masked(client, seeded, login, db_session):
    created = _create(
        client, login("hoang@branch.vn"),
        citizen_id=CITIZEN_ID, bank_account=BANK_ACCOUNT,
    )
    event = (
        db_session.query(EventLog)
        .filter(EventLog.loan_application_id == created["id"],
                EventLog.action == "loan.created")
        .one()
    )
    assert CITIZEN_ID not in event.detail and BANK_ACCOUNT not in event.detail
    assert "********7890" in event.detail


def test_no_audit_row_is_written_when_nothing_can_be_revealed(client, seeded, login, db_session):
    headers = login("hoang@branch.vn")
    created = _create(client, headers)  # no identifiers
    resp = client.post(
        f"/api/loan-applications/{created['id']}/sensitive-data/reveal",
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json() == {"citizen_id": None, "bank_account": None}
    assert db_session.query(EventLog).filter(
        EventLog.action.in_(("citizen_id.viewed", "bank_account.viewed"))
    ).count() == 0


def test_br8_another_officer_cannot_reveal(client, seeded, login, db_session):
    created = _create(client, login("hoang@branch.vn"), citizen_id=CITIZEN_ID)
    resp = client.post(
        f"/api/loan-applications/{created['id']}/sensitive-data/reveal",
        headers=login("linh@branch.vn"),
    )
    assert resp.status_code == 403
    assert db_session.query(EventLog).filter(
        EventLog.action == "citizen_id.viewed"
    ).count() == 0


def test_reveal_missing_application_is_404(client, seeded, login, db_session):
    resp = client.post(
        "/api/loan-applications/missing/sensitive-data/reveal",
        headers=login("hoang@branch.vn"),
    )
    assert resp.status_code == 404
    assert db_session.query(EventLog).filter(
        EventLog.action.in_(("citizen_id.viewed", "bank_account.viewed"))
    ).count() == 0


def test_br8_manager_can_reveal_any_application(client, seeded, login):
    created = _create(client, login("hoang@branch.vn"), citizen_id=CITIZEN_ID)
    resp = client.post(
        f"/api/loan-applications/{created['id']}/sensitive-data/reveal",
        headers=login("thanh@branch.vn"),
    )
    assert resp.status_code == 200
    assert resp.json()["citizen_id"] == CITIZEN_ID


def test_reveal_requires_a_token(client, seeded, login):
    created = _create(client, login("hoang@branch.vn"), citizen_id=CITIZEN_ID)
    resp = client.post(
        f"/api/loan-applications/{created['id']}/sensitive-data/reveal"
    )
    assert resp.status_code == 401


# --- identifiers never reach the model ----------------------------------

def test_identifiers_are_not_model_features(client, seeded, login, db_session):
    headers = login("hoang@branch.vn")
    created = _create(
        client, headers, citizen_id=CITIZEN_ID, bank_account=BANK_ACCOUNT
    )
    body = client.post(
        f"/api/loan-applications/{created['id']}/score", headers=headers
    ).json()
    assert body["result"]["score"] is not None

    from app.models import LoanApplication, ScoringResult
    loan = db_session.get(LoanApplication, created["id"])
    assert set(scoring.build_features(loan)) == {
        "dsr", "loan_to_annual_income", "term_months", "cic_debt_group", "has_history"
    }
    result = db_session.query(ScoringResult).filter(
        ScoringResult.loan_application_id == created["id"]
    ).one()
    snapshot = str(result.input_snapshot)
    assert CITIZEN_ID not in snapshot and BANK_ACCOUNT not in snapshot
    assert "7890" not in snapshot
    explanation = " ".join(result.explanation)
    assert CITIZEN_ID not in explanation and BANK_ACCOUNT not in explanation


# --- key not configured -------------------------------------------------

def test_missing_key_is_503_and_saves_nothing(client, seeded, login, db_session, monkeypatch):
    class Unconfigured:
        DATA_ENCRYPTION_KEY = ""

    monkeypatch.setattr(privacy, "get_settings", lambda: Unconfigured())
    headers = login("hoang@branch.vn")
    before = len(client.get("/api/loan-applications", headers=headers).json())
    resp = client.post(
        "/api/loan-applications", headers=headers,
        json={**VALID_APPLICATION, "citizen_id": CITIZEN_ID},
    )
    assert resp.status_code == 503
    assert "init_secrets" in resp.json()["detail"]
    assert len(client.get("/api/loan-applications", headers=headers).json()) == before


def test_application_without_identifiers_still_works_without_a_key(client, seeded, login, monkeypatch):
    """A missing key must not block ordinary lending work."""
    class Unconfigured:
        DATA_ENCRYPTION_KEY = ""

    monkeypatch.setattr(privacy, "get_settings", lambda: Unconfigured())
    created = _create(client, login("hoang@branch.vn"))
    assert created["status"] == "pending"


def test_wrong_key_cannot_open_a_stored_identifier(client, seeded, login, monkeypatch):
    from cryptography.fernet import Fernet

    headers = login("hoang@branch.vn")
    created = _create(client, headers, citizen_id=CITIZEN_ID)

    class RotatedKey:
        DATA_ENCRYPTION_KEY = Fernet.generate_key().decode("ascii")

    monkeypatch.setattr(privacy, "get_settings", lambda: RotatedKey())
    resp = client.post(
        f"/api/loan-applications/{created['id']}/sensitive-data/reveal",
        headers=headers,
    )
    assert resp.status_code == 503
    assert "original encryption key" in resp.json()["detail"]


def test_reveal_response_is_not_cacheable(client, seeded, login):
    """BR7: the one response carrying full numbers must not be stored."""
    headers = login("hoang@branch.vn")
    created = _create(client, headers, citizen_id=CITIZEN_ID)
    resp = client.post(
        f"/api/loan-applications/{created['id']}/sensitive-data/reveal",
        headers=headers,
    )
    assert resp.headers["cache-control"] == "no-store"
    assert resp.headers["pragma"] == "no-cache"


def test_ordinary_detail_is_not_marked_no_store(client, seeded, login):
    """Only the reveal route needs it; masked data stays normally cacheable."""
    headers = login("hoang@branch.vn")
    created = _create(client, headers, citizen_id=CITIZEN_ID)
    resp = client.get(f"/api/loan-applications/{created['id']}", headers=headers)
    assert resp.headers.get("cache-control") != "no-store"
