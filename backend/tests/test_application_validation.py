"""Input-validation edge cases for POST /api/loan-applications and the 422 handler."""
import pytest

from app.models import LoanApplication
from tests.conftest import VALID_APPLICATION

URL = "/api/loan-applications"
JSON_HEADER = {"content-type": "application/json"}
LABELS = {
    "monthly_income": "Monthly income",
    "loan_amount": "Loan amount",
    "estimated_monthly_payment": "Estimated monthly payment",
}
MONEY_FIELDS = list(LABELS)


def _post(client, headers, **overrides):
    return client.post(URL, headers=headers, json={**VALID_APPLICATION, **overrides})


def _count(db):
    return db.query(LoanApplication).count()


def _expect_rejected(client, seeded, login, field, fragment, **overrides):
    headers = login("hoang@branch.vn")
    before = _count(seeded)
    resp = _post(client, headers, **overrides)
    assert resp.status_code == 422, resp.text
    message = resp.json()["errors"][field]
    assert fragment in message, message
    assert _count(seeded) == before
    return message


# TC-US09-04
@pytest.mark.parametrize("blank", ["   ", "\t\n"])
def test_us09_whitespace_income_is_reported_as_required(client, seeded, login, blank):
    message = _expect_rejected(client, seeded, login, "monthly_income", "is required", monthly_income=blank)
    assert message == "Income is required"


# TC-US09-05
def test_us09_null_income_is_reported_as_required(client, seeded, login):
    message = _expect_rejected(client, seeded, login, "monthly_income", "is required", monthly_income=None)
    assert message == "Income is required"


# TC-US09-06
@pytest.mark.parametrize(
    "field", ["monthly_income", "loan_amount", "loan_term_months", "estimated_monthly_payment", "cic_debt_group"]
)
@pytest.mark.parametrize("flag", [True, False])
def test_us09_boolean_is_not_a_whole_number(client, seeded, login, field, flag):
    message = _expect_rejected(client, seeded, login, field, "must be a whole number.", **{field: flag})
    assert message.endswith("must be a whole number.")


REJECTED_VALUES = [
    ("", "is required"),
    ("   ", "is required"),
    (None, "is required"),
    ("abc", "must be a whole number"),
    ("12a", "must be a whole number"),
    ("1.5", "must be a whole number"),
    (1.5, "must be a whole number"),
    ("1_000", "must be a whole number"),
    ("+5", "must be a whole number"),
    ("9" * 5000, "must not exceed"),
    (-1, "must be greater than 0"),
    ("-1", "must be greater than 0"),
    (0, "must be greater than 0"),
    (10**13 + 1, "must not exceed"),
]


# TC-US09-07
@pytest.mark.parametrize("field", MONEY_FIELDS)
@pytest.mark.parametrize(("value", "fragment"), REJECTED_VALUES)
def test_us09_money_field_rejections_save_nothing(client, seeded, login, field, value, fragment):
    message = _expect_rejected(client, seeded, login, field, fragment, **{field: value})
    label = "Income" if field == "monthly_income" and fragment == "is required" else LABELS[field]
    assert message.startswith(label)


# Accepted edge values; a lone 1 or 10**13 needs a matching loan/payment to satisfy BR9.
ACCEPTED = [
    ("monthly_income", 1, {}),
    ("monthly_income", 10**13, {}),
    ("monthly_income", " 20000000 ", {}),
    ("monthly_income", "020000000", {}),
    ("loan_amount", 1, {"estimated_monthly_payment": 1}),
    ("loan_amount", 10**13, {"estimated_monthly_payment": 10**13}),
    ("loan_amount", " 100000000 ", {}),
    ("estimated_monthly_payment", 1, {"loan_amount": 1}),
    ("estimated_monthly_payment", 10**13, {"loan_amount": 10**13}),
    ("estimated_monthly_payment", " 5000000 ", {}),
]


# TC-US09-08
@pytest.mark.parametrize(("field", "value", "extra"), ACCEPTED)
def test_us09_money_field_accepted_edges(client, seeded, login, field, value, extra):
    before = _count(seeded)
    resp = _post(client, login("hoang@branch.vn"), **{field: value}, **extra)
    assert resp.status_code == 201, resp.text
    assert resp.json()[field] == int(str(value).strip())
    assert _count(seeded) == before + 1


# TC-US09-09
@pytest.mark.parametrize("blank", ["", "   ", None])
def test_us09_blank_cic_group_means_not_provided(client, seeded, login, blank):
    resp = _post(client, login("hoang@branch.vn"), cic_debt_group=blank)
    assert resp.status_code == 201, resp.text
    assert resp.json()["cic_debt_group"] is None


# TC-US09-10
@pytest.mark.parametrize(
    ("term", "ok"), [(0, False), (1, True), (600, True), (601, False), (12.5, False), ("12.5", False), (" 12 ", True)]
)
def test_us09_loan_term_edges(client, seeded, login, term, ok):
    before = _count(seeded)
    resp = _post(client, login("hoang@branch.vn"), loan_term_months=term, estimated_monthly_payment=100_000_000)
    assert resp.status_code == (201 if ok else 422), resp.text
    assert _count(seeded) == before + (1 if ok else 0)
    if not ok:
        assert "loan_term_months" in resp.json()["errors"]


# TC-US09-11
@pytest.mark.parametrize(
    ("group", "ok"), [(0, False), (1, True), (5, True), (6, False), (None, True), ("2", True), ("x", False), (2.5, False)]
)
def test_us09_cic_group_edges(client, seeded, login, group, ok):
    before = _count(seeded)
    resp = _post(client, login("hoang@branch.vn"), cic_debt_group=group)
    assert resp.status_code == (201 if ok else 422), resp.text
    assert _count(seeded) == before + (1 if ok else 0)
    if ok:
        assert resp.json()["cic_debt_group"] == (None if group is None else int(group))
    else:
        assert "cic_debt_group" in resp.json()["errors"]


# TC-US09-12
@pytest.mark.parametrize("field", ["purpose", "credit_history_note"])
@pytest.mark.parametrize(("length", "ok"), [(500, True), (501, False)])
def test_us09_text_length_limit_500(client, seeded, login, field, length, ok):
    resp = _post(client, login("hoang@branch.vn"), **{field: "a" * length})
    assert resp.status_code == (201 if ok else 422), resp.text
    if ok:
        assert resp.json()[field] == "a" * 500
    else:
        label = "Loan purpose" if field == "purpose" else "Credit history"
        assert resp.json()["errors"][field] == f"{label} must not exceed 500 characters."


# TC-US09-13
def test_us09_limit_applies_after_trimming_whitespace(client, seeded, login):
    headers = login("hoang@branch.vn")
    resp = _post(client, headers, purpose="  " + "a" * 500 + "  ")
    assert resp.status_code == 201 and resp.json()["purpose"] == "a" * 500
    assert _post(client, headers, purpose=" " + "a" * 501 + " ").status_code == 422


# TC-US09-14
def test_us09_vietnamese_text_is_stored_intact(client, seeded, login):
    text = "Mua xe máy cho con đi học"
    note = "Đã vay 3 năm, trả đúng hạn"
    resp = _post(client, login("hoang@branch.vn"), purpose=f"  {text} ", credit_history_note=note)
    assert resp.status_code == 201
    stored = seeded.get(LoanApplication, resp.json()["id"])
    assert stored.purpose == text and stored.credit_history_note == note


# TC-US09-15
@pytest.mark.parametrize("field", ["purpose", "credit_history_note"])
@pytest.mark.parametrize("blank", ["", "   ", "\t\n", None])
def test_us09_blank_optional_text_is_stored_as_null(client, seeded, login, field, blank):
    resp = _post(client, login("hoang@branch.vn"), **{field: blank})
    assert resp.status_code == 201, resp.text
    assert resp.json()[field] is None
    seeded.expire_all()
    assert getattr(seeded.get(LoanApplication, resp.json()["id"]), field) is None


# TC-US09-16
def test_us09_optional_text_must_be_text(client, seeded, login):
    message = _expect_rejected(client, seeded, login, "purpose", "must be text", purpose=123)
    assert message == "Loan purpose must be text."


# BR9: the monthly payment must be able to repay the loan within the term.

# TC-US03-05
def test_br9_one_dong_payment_on_a_large_loan_is_rejected(client, seeded, login):
    message = _expect_rejected(
        client, seeded, login, "estimated_monthly_payment", "must cover the loan amount",
        estimated_monthly_payment=1)
    assert message == "Estimated monthly payment multiplied by the loan term must cover the loan amount."


# TC-US03-06
def test_br9_payment_above_the_loan_amount_is_rejected(client, seeded, login):
    message = _expect_rejected(
        client, seeded, login, "estimated_monthly_payment", "must not exceed the loan amount",
        loan_amount=1_000_000, estimated_monthly_payment=1_000_001)
    assert message == "Estimated monthly payment must not exceed the loan amount."


# TC-US03-07
def test_br9_payment_times_term_equal_to_loan_is_accepted(client, seeded, login):
    resp = _post(client, login("hoang@branch.vn"), loan_amount=120_000_000, loan_term_months=24,
                 estimated_monthly_payment=5_000_000)
    assert resp.status_code == 201, resp.text


# TC-US03-08
def test_br9_boundary_one_dong_over_is_rejected(client, seeded, login):
    headers = login("hoang@branch.vn")
    ok = _post(client, headers, loan_amount=100_000_000, loan_term_months=25, estimated_monthly_payment=4_000_000)
    assert ok.status_code == 201, ok.text
    before = _count(seeded)
    bad = _post(client, headers, loan_amount=100_000_001, loan_term_months=25, estimated_monthly_payment=4_000_000)
    assert bad.status_code == 422
    assert "must cover the loan amount" in bad.json()["errors"]["estimated_monthly_payment"]
    assert _count(seeded) == before


# TC-US03-09
def test_br9_is_skipped_when_loan_fields_are_invalid(client, seeded, login):
    resp = _post(client, login("hoang@branch.vn"), loan_amount="abc", estimated_monthly_payment=1)
    errors = resp.json()["errors"]
    assert resp.status_code == 422
    assert errors["loan_amount"] == "Loan amount must be a whole number."
    assert "estimated_monthly_payment" not in errors


# Handler message branches (#20).

# TC-US09-17
@pytest.mark.parametrize(
    ("overrides", "field", "expected"),
    [
        ({"monthly_income": None}, "monthly_income", "Income is required"),
        ({"monthly_income": "abc"}, "monthly_income", "Monthly income must be a whole number."),
        ({"monthly_income": 0}, "monthly_income", "Monthly income must be greater than 0 VND."),
        ({"loan_amount": 0}, "loan_amount", "Loan amount must be greater than 0."),
        ({"cic_debt_group": 0}, "cic_debt_group", "CIC debt group must be at least 1."),
        ({"loan_term_months": 601}, "loan_term_months", "Loan term must not exceed 600."),
        ({"purpose": "x" * 501}, "purpose", "Loan purpose must not exceed 500 characters."),
        ({"purpose": 123}, "purpose", "Loan purpose must be text."),
        ({"foo": 1}, "foo", "Unknown field 'foo' is not accepted."),
        ({"estimated_monthly_payment": 1}, "estimated_monthly_payment",
         "Estimated monthly payment multiplied by the loan term must cover the loan amount."),
    ],
)
def test_us09_each_message_branch(client, seeded, login, overrides, field, expected):
    resp = _post(client, login("hoang@branch.vn"), **overrides)
    assert resp.status_code == 422
    assert resp.json()["errors"][field] == expected


# TC-US09-18
def test_us09_malformed_json_is_reported_on_form(client, seeded, login):
    resp = client.post(URL, headers={**login("hoang@branch.vn"), **JSON_HEADER}, content=b"{bad")
    assert resp.status_code == 422
    assert resp.json()["errors"] == {"form": "The request contains invalid JSON. Check it and try again."}


# TC-US09-19
@pytest.mark.parametrize(
    ("body", "content_type"),
    [(b"[1, 2]", "application/json"), (b"[]", "application/json"), (b"null", "application/json"),
     (b"5", "application/json"), (b'"text"', "application/json"), (b"", "application/json"),
     (b"hello", "text/plain")],
)
def test_us09_non_object_body_is_reported_on_form(client, seeded, login, body, content_type):
    before = _count(seeded)
    resp = client.post(URL, headers={**login("hoang@branch.vn"), "content-type": content_type}, content=body)
    assert resp.status_code == 422
    assert resp.json()["errors"] == {"form": "The request body must be a JSON object."}
    assert _count(seeded) == before


# TC-US09-20
def test_us09_fallback_message_for_other_error_types(client, seeded, login):
    # 1e999 is valid JSON read as infinity (pydantic type finite_number), which no named branch covers.
    headers = {**login("hoang@branch.vn"), **JSON_HEADER}
    body = (b'{"monthly_income": 1e999, "loan_amount": 100000000,'
            b' "loan_term_months": 24, "estimated_monthly_payment": 5000000}')
    resp = client.post(URL, headers=headers, content=body)
    assert resp.status_code == 422
    assert resp.json()["errors"]["monthly_income"] == (
        "Monthly income is invalid. Check its format and try again."
    )
