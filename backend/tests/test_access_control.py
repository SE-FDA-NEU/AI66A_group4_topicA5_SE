from urllib.parse import quote

import pytest

from app.models import User

ODD_IDS = {
    "very_long": "a" * 5000,
    "quotes": "' OR '1'='1\"--",
    "unicode": "đơn-vay-☃-\U0001f600",
    "uuid_like_missing": "00000000-0000-4000-8000-000000000000",
    "spaces": "has space",
    "percent": "100%25",
}
ROUTES = [
    ("get", "/api/loan-applications/{id}"),
    ("post", "/api/loan-applications/{id}/score"),
    ("get", "/api/loan-applications/{id}/scores"),
    ("patch", "/api/loan-applications/{id}/approve"),
    ("post", "/api/loan-applications/{id}/sensitive-data/reveal"),
]
OFFICER_LOOKUP_ROUTES = [r for r in ROUTES if not r[1].endswith("/approve")]
PROTECTED = [
    ("get", "/api/loan-applications"),
    ("post", "/api/loan-applications"),
    ("get", "/api/dashboard/summary"),
    ("get", "/api/admin/users"),
    ("post", "/api/admin/users"),
    ("patch", "/api/admin/users/some-id"),
    *[(m, p.format(id="some-id")) for m, p in ROUTES],
]


def _call(client, method, path, headers, odd_id=None):
    if odd_id is not None:
        path = path.format(id=quote(odd_id, safe=""))
    return client.request(method, path, headers=headers)


@pytest.mark.parametrize("who,method,path", [
    *[("hoang@branch.vn", m, p) for m, p in OFFICER_LOOKUP_ROUTES],  # an Officer never reaches the approve lookup
    *[("thanh@branch.vn", m, p) for m, p in ROUTES],
])
@pytest.mark.parametrize("odd_id", list(ODD_IDS.values()), ids=list(ODD_IDS))
# TC-US05-01
def test_odd_application_ids_give_404_never_500(client, seeded, login, odd_id, method, path, who):
    resp = _call(client, method, path, login(who), odd_id)
    assert resp.status_code == 404, resp.text


@pytest.mark.parametrize("method,path", ROUTES)
# TC-US05-02
def test_officer_gets_403_on_another_officers_application(client, seeded, login, method, path):
    other = client.get("/api/loan-applications", headers=login("linh@branch.vn")).json()[0]["id"]
    resp = _call(client, method, path.format(id=other), login("hoang@branch.vn"))
    assert resp.status_code == 403, resp.text


# TC-US05-03
def test_other_officers_application_is_not_changed_by_a_blocked_score(client, seeded, login):
    other = client.get("/api/loan-applications", headers=login("linh@branch.vn")).json()[0]
    assert client.post(f"/api/loan-applications/{other['id']}/score", headers=login("hoang@branch.vn")).status_code == 403
    after = client.get(f"/api/loan-applications/{other['id']}", headers=login("linh@branch.vn")).json()
    assert after["status"] == other["status"] and after["latest_score"] == other["latest_score"]


@pytest.mark.parametrize("method,path", PROTECTED)
# TC-US01-50
def test_deactivated_officer_token_is_401_on_every_protected_route(client, seeded, login, method, path):
    officer = login("hoang@branch.vn")
    user = seeded.query(User).filter_by(email="hoang@branch.vn").one()
    resp = client.patch(f"/api/admin/users/{user.id}", headers=login("thanh@branch.vn"), json={"is_active": False})
    assert resp.status_code == 200
    resp = client.request(method, path, headers=officer, json={})
    assert resp.status_code == 401, resp.text


@pytest.mark.parametrize("method,path", PROTECTED)
# TC-US01-51
def test_deactivated_manager_token_is_401_on_every_protected_route(client, seeded, login, method, path):
    manager = login("thanh@branch.vn")
    user = seeded.query(User).filter_by(email="thanh@branch.vn").one()
    user.is_active = False
    seeded.commit()
    resp = client.request(method, path, headers=manager, json={})
    assert resp.status_code == 401, resp.text
