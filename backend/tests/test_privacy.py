import pytest
from cryptography.fernet import Fernet
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.config import get_settings
from app.models import EventLog, LoanApplication, ScoringResult
from tests.conftest import VALID_APPLICATION

IDENTIFIERS = {'citizen_id': '001234567890', 'bank_account': '01234567890123'}


def create(client, login, **changes):
    headers = login('hoang@branch.vn')
    response = client.post('/api/loan-applications', headers=headers, json={**VALID_APPLICATION, **IDENTIFIERS, **changes})
    return response, headers


def test_br7_database_is_encrypted_normal_responses_are_masked_and_reveal_is_audited(client, seeded, login):
    response, headers = create(client, login)
    assert response.status_code == 201
    data = response.json()
    assert data['citizen_id_masked'] == '********7890'
    assert data['bank_account_masked'] == '********0123'
    raw = seeded.execute(text('SELECT citizen_id_encrypted, bank_account_encrypted FROM loan_applications WHERE id=:id'), {'id': data['id']}).one()
    encryption = Fernet(get_settings().DATA_ENCRYPTION_KEY.encode())
    assert encryption.decrypt(raw[0].encode()).decode() == IDENTIFIERS['citizen_id']
    assert encryption.decrypt(raw[1].encode()).decode() == IDENTIFIERS['bank_account']
    assert not any(value in str(raw) or value in response.text for value in IDENTIFIERS.values())
    for path in ('/api/loan-applications', f"/api/loan-applications/{data['id']}", '/loan-applications'):
        result = client.get(path, headers=headers)
        assert not any(value in result.text for value in IDENTIFIERS.values())
        assert 'encrypted' not in result.text
    reveal = client.post(f"/api/loan-applications/{data['id']}/sensitive-data/reveal", headers=headers)
    assert reveal.json() == IDENTIFIERS
    assert 'no-store' in reveal.headers['cache-control']
    logs = seeded.query(EventLog).filter(EventLog.action.like('%.viewed')).all()
    assert {log.action for log in logs} == {'citizen_id.viewed', 'bank_account.viewed'}
    assert all(log.actor_id == data['owner_id'] and log.loan_application_id == data['id'] and log.created_at for log in logs)
    assert not any(value in str([log.detail for log in logs]) for value in IDENTIFIERS.values())


def test_br7_wrong_owner_cannot_reveal_but_manager_can(client, seeded, login):
    response, _ = create(client, login)
    path = f"/api/loan-applications/{response.json()['id']}/sensitive-data/reveal"
    assert client.post(path).status_code == 401
    assert client.post(path, headers=login('linh@branch.vn')).status_code == 403
    assert seeded.query(EventLog).filter(EventLog.action.like('%.viewed')).count() == 0
    manager_headers = login('thanh@branch.vn')
    assert client.post(path, headers=manager_headers).json() == IDENTIFIERS


@pytest.mark.parametrize('field,value', [('citizen_id', 'abc'), ('citizen_id', 123456789), ('citizen_id', '123'), ('bank_account', '12345'), ('bank_account', '1'*21), ('bank_account', '\uff11'*12)])
def test_invalid_identifiers_do_not_echo_input_or_save(client, seeded, login, field, value):
    before = seeded.query(LoanApplication).count()
    response, _ = create(client, login, **{field: value})
    assert response.status_code == 422 and field in response.json()['errors']
    assert seeded.query(LoanApplication).count() == before


def test_missing_key_fails_closed_without_saving(client, seeded, login, monkeypatch):
    monkeypatch.setattr(get_settings(), 'DATA_ENCRYPTION_KEY', '')
    before = seeded.query(LoanApplication).count()
    response, _ = create(client, login)
    assert response.status_code == 503
    assert seeded.query(LoanApplication).count() == before
    assert not any(value in response.text for value in IDENTIFIERS.values())


def test_wrong_key_fails_closed_without_audit_or_plaintext(client, seeded, login, monkeypatch):
    response, headers = create(client, login)
    monkeypatch.setattr(get_settings(), 'DATA_ENCRYPTION_KEY', Fernet.generate_key().decode())
    reveal = client.post(f"/api/loan-applications/{response.json()['id']}/sensitive-data/reveal", headers=headers)
    assert reveal.status_code == 503
    assert seeded.query(EventLog).filter(EventLog.action.like('%.viewed')).count() == 0
    assert not any(value in reveal.text for value in IDENTIFIERS.values())


def test_audit_failure_does_not_release_plaintext(client, seeded, login, monkeypatch):
    response, headers = create(client, login)

    def fail_commit():
        raise SQLAlchemyError('Audit database is unavailable')

    monkeypatch.setattr(seeded, 'commit', fail_commit)
    reveal = client.post(f"/api/loan-applications/{response.json()['id']}/sensitive-data/reveal", headers=headers)
    assert reveal.status_code == 503 and 'Access could not be recorded' in reveal.json()['detail']
    assert not any(value in reveal.text for value in IDENTIFIERS.values())
    assert seeded.query(EventLog).filter(EventLog.action.like('%.viewed')).count() == 0


def test_identifiers_are_not_model_features_snapshots_or_logs(client, seeded, login):
    response, headers = create(client, login)
    loan_id = response.json()['id']
    result = client.post(f'/api/loan-applications/{loan_id}/score', headers=headers)
    assert result.status_code == 201
    snapshots = [row.input_snapshot for row in seeded.query(ScoringResult).filter_by(loan_application_id=loan_id)]
    logs = [row.detail for row in seeded.query(EventLog)]
    assert not any(value in str(snapshots) + str(logs) + result.text for value in IDENTIFIERS.values())


def test_repeated_lookup_logs_each_access(client, seeded, login):
    response, headers = create(client, login)
    for _ in range(2):
        assert client.post(f"/api/loan-applications/{response.json()['id']}/sensitive-data/reveal", headers=headers).status_code == 200
    assert seeded.query(EventLog).filter(EventLog.action.like('%.viewed')).count() == 4


def test_missing_identifiers_return_null(client, seeded, login):
    response, headers = create(client, login, citizen_id=None, bank_account=None)
    assert client.post(f"/api/loan-applications/{response.json()['id']}/sensitive-data/reveal", headers=headers).json() == {'citizen_id': None, 'bank_account': None}


def test_forged_ciphertext_or_owner_is_rejected(client, seeded, login):
    response, _ = create(client, login, citizen_id_encrypted='forged', created_by='other')
    assert response.status_code == 422
