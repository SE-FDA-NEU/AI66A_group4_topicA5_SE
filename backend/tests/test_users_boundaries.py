import pytest

from app.models import User

EMPLOYEE = {"email": "new.officer@branch.vn", "full_name": "New Officer", "password": "SampleOnly!Pass123"}
URL = "/api/admin/users"


def _email_of_length(length):
    tail = "@b.vn"
    return "a" * (length - len(tail)) + tail


def _create(client, login, **overrides):
    return client.post(URL, headers=login("thanh@branch.vn"), json={**EMPLOYEE, **overrides})


def _officer_path(db):
    return f"{URL}/{db.query(User).filter_by(email='hoang@branch.vn').one().id}"


@pytest.mark.parametrize("name,status", [
    ("A", 201), ("N" * 100, 201), ("  " + "N" * 100 + "  ", 201),
    ("N" * 101, 422), ("", 422), ("   ", 422),
])
# TC-US01-30
def test_full_name_length_boundaries_on_create(client, seeded, login, name, status):
    resp = _create(client, login, full_name=name)
    assert resp.status_code == status
    if status == 201:
        assert resp.json()["full_name"] == name.strip()


@pytest.mark.parametrize("length,status", [(254, 201), (255, 422)])
# TC-US01-31
def test_email_length_boundaries_on_create(client, seeded, login, length, status):
    assert _create(client, login, email=_email_of_length(length)).status_code == status


@pytest.mark.parametrize("email", ["user@branch", "user@", "@branch.vn", "user branch@x.vn", "plain", ""])
# TC-US01-32
def test_malformed_email_is_rejected(client, seeded, login, email):
    assert _create(client, login, email=email).status_code == 422


@pytest.mark.parametrize("length,status", [(11, 422), (12, 201), (128, 201), (129, 422)])
# TC-US01-33
def test_password_length_boundaries_on_create(client, seeded, login, length, status):
    assert _create(client, login, password="p" * length).status_code == status


@pytest.mark.parametrize("field,value", [
    ("full_name", 123), ("full_name", None), ("full_name", ["x"]),
    ("email", 123), ("email", None), ("email", ["a@b.vn"]),
    ("password", 123456789012345), ("password", None), ("password", ["p" * 12]),
])
# TC-US01-34
def test_non_string_values_are_rejected_on_create(client, seeded, login, field, value):
    assert _create(client, login, **{field: value}).status_code == 422


@pytest.mark.parametrize("missing", ["email", "full_name", "password"])
# TC-US01-35
def test_missing_field_is_rejected_on_create(client, seeded, login, missing):
    body = {k: v for k, v in EMPLOYEE.items() if k != missing}
    assert client.post(URL, headers=login("thanh@branch.vn"), json=body).status_code == 422


# TC-US01-36
def test_empty_patch_body_is_rejected(client, seeded, login):
    resp = client.patch(_officer_path(seeded), headers=login("thanh@branch.vn"), json={})
    assert resp.status_code == 422


@pytest.mark.parametrize("body", [
    {"role": "admin"}, {"email": "x@y.vn"}, {"password": "SampleOnly!Pass123"},
    {"full_name": "Ok Name", "role": "admin"}, {"is_active": False, "token_version": 9},
])
# TC-US01-37
def test_unknown_patch_field_is_rejected_and_nothing_changes(client, seeded, login, body):
    path = _officer_path(seeded)
    assert client.patch(path, headers=login("thanh@branch.vn"), json=body).status_code == 422
    user = seeded.query(User).filter_by(email="hoang@branch.vn").one()
    assert user.role.value == "user" and user.is_active is True and user.full_name == "Do Viet Hoang"


@pytest.mark.parametrize("name,status", [("N" * 100, 200), ("N" * 101, 422), ("   ", 422), ("", 422), (123, 422), (None, 422)])
# TC-US01-38
def test_full_name_boundaries_on_patch(client, seeded, login, name, status):
    resp = client.patch(_officer_path(seeded), headers=login("thanh@branch.vn"), json={"full_name": name})
    assert resp.status_code == status


@pytest.mark.parametrize("value", ["true", "false", 1, 0, None, "yes"])
# TC-US01-39
def test_is_active_must_be_a_real_bool(client, seeded, login, value):
    resp = client.patch(_officer_path(seeded), headers=login("thanh@branch.vn"), json={"is_active": value})
    assert resp.status_code == 422
    assert seeded.query(User).filter_by(email="hoang@branch.vn").one().is_active is True


# TC-US01-40
def test_manager_targets_are_forbidden_for_every_patch_field(client, seeded, login):
    manager = seeded.query(User).filter_by(email="thanh@branch.vn").one()
    headers = login("thanh@branch.vn")
    for body in ({"is_active": False}, {"full_name": "Renamed"}):
        assert client.patch(f"{URL}/{manager.id}", headers=headers, json=body).status_code == 403
    seeded.refresh(manager)
    assert manager.is_active is True and manager.full_name == "Do Hong Thanh"


@pytest.mark.parametrize("variant", ["NEW.Officer@Branch.VN", "New.Officer@branch.vn", "NEW.OFFICER@BRANCH.VN"])
# TC-US01-41
def test_duplicate_email_in_a_different_case_is_conflict(client, seeded, login, variant):
    assert _create(client, login).status_code == 201
    assert _create(client, login, email=variant).status_code == 409
    assert seeded.query(User).filter(User.email == EMPLOYEE["email"]).count() == 1


# TC-US01-42
def test_email_is_stored_lowercase_and_trimmed(client, seeded, login):
    resp = _create(client, login, email="  Mixed.Case@Branch.VN  ")
    assert resp.status_code == 201 and resp.json()["email"] == "mixed.case@branch.vn"
