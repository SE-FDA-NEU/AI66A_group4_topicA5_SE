from app.models import EventLog, User
from app.security import verify_password
from app.seed import TEST_PASSWORD

EMPLOYEE = {'email': 'new.officer@branch.vn', 'full_name': 'New Officer', 'password': 'SampleOnly!Pass123'}


def test_only_manager_can_manage_employees(client, seeded, login):
    for path in ('/api/admin/users',):
        assert client.get(path).status_code == 401
        assert client.get(path, headers=login('hoang@branch.vn')).status_code == 403
    assert client.post('/api/admin/users', headers=login('hoang@branch.vn'), json=EMPLOYEE).status_code == 403
    assert client.patch('/api/admin/users/missing', headers=login('linh@branch.vn'), json={'is_active': False}).status_code == 403


def test_manager_creates_officer_and_password_is_hashed(client, seeded, login):
    manager = login('thanh@branch.vn')
    response = client.post('/api/admin/users', headers=manager, json=EMPLOYEE)
    assert response.status_code == 201
    data = response.json()
    assert data['role'] == 'user' and data['is_active'] is True
    assert 'password' not in response.text and 'hashed_password' not in response.text
    user = seeded.get(User, data['id'])
    assert user.hashed_password != EMPLOYEE['password'] and verify_password(EMPLOYEE['password'], user.hashed_password)
    assert client.post('/api/auth/login', json={'email': EMPLOYEE['email'], 'password': EMPLOYEE['password']}).status_code == 200
    assert seeded.query(EventLog).filter_by(action='user.created').count() == 1


def test_duplicate_email_is_clear_conflict(client, seeded, login):
    manager = login('thanh@branch.vn')
    assert client.post('/api/admin/users', headers=manager, json=EMPLOYEE).status_code == 201
    assert client.post('/api/admin/users', headers=manager, json={**EMPLOYEE, 'email': EMPLOYEE['email'].upper()}).status_code == 409


def test_deactivation_revokes_token_and_keeps_loans_even_after_reactivation(client, seeded, login):
    officer = login('hoang@branch.vn')
    manager = login('thanh@branch.vn')
    user = seeded.query(User).filter_by(email='hoang@branch.vn').one()
    path = f'/api/admin/users/{user.id}'
    assert client.patch(path, headers=manager, json={'is_active': False}).status_code == 200
    assert client.get('/api/loan-applications', headers=officer).status_code == 401
    assert client.post('/api/auth/login', json={'email': 'hoang@branch.vn', 'password': TEST_PASSWORD}).status_code == 403
    assert client.patch(path, headers=manager, json={'is_active': True}).status_code == 200
    assert client.get('/api/loan-applications', headers=officer).status_code == 401
    assert len(client.get('/api/loan-applications', headers=login('hoang@branch.vn')).json()) == 7


def test_update_name_and_protect_manager_accounts(client, seeded, login):
    manager = login('thanh@branch.vn')
    users = client.get('/api/admin/users', headers=manager).json()
    assert len(users) == 3 and all('hashed_password' not in row for row in users)
    officer = next(row for row in users if row['role'] == 'user')
    assert client.patch(f"/api/admin/users/{officer['id']}", headers=manager, json={'full_name': 'Updated Officer'}).json()['full_name'] == 'Updated Officer'
    admin = next(row for row in users if row['role'] == 'admin')
    assert client.patch(f"/api/admin/users/{admin['id']}", headers=manager, json={'is_active': False}).status_code == 403


def test_bad_employee_input_is_rejected(client, seeded, login):
    manager = login('thanh@branch.vn')
    for body in ({**EMPLOYEE, 'email': 'invalid'}, {**EMPLOYEE, 'password': 'short'}, {**EMPLOYEE, 'role': 'admin'}, {**EMPLOYEE, 'full_name': ''}):
        assert client.post('/api/admin/users', headers=manager, json=body).status_code == 422
    officer = seeded.query(User).filter_by(email='hoang@branch.vn').one()
    assert client.patch(f'/api/admin/users/{officer.id}', headers=manager, json={'is_active': 'false'}).status_code == 422
    assert client.patch('/api/admin/users/missing', headers=manager, json={'is_active': False}).status_code == 404
