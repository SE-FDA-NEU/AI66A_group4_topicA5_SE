from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from fastapi import HTTPException
from sqlalchemy import MetaData, create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.init_secrets import initialize
from app.migrate import ensure_schema
from app.models import LoanApplication, LoanStatus, ScoringResult, User
from app.scoring_service import score_application
from tests.conftest import VALID_APPLICATION


def test_secrets_setup_is_idempotent_and_keeps_existing_configuration(tmp_path):
    env = tmp_path / '.env'
    env.write_text('DATABASE_URL=sqlite:///keep.db\nJWT_SECRET=dev-only-change-me\n')
    assert initialize(env)
    contents = env.read_text()
    assert 'keep.db' in contents and 'dev-only-change-me' not in contents
    assert not initialize(env) and env.read_text() == contents


def test_invalid_existing_key_is_not_replaced(tmp_path):
    env = tmp_path / '.env'
    env.write_text('DATA_ENCRYPTION_KEY=invalid\n')
    with pytest.raises(ValueError):
        initialize(env)
    assert env.read_text() == 'DATA_ENCRYPTION_KEY=invalid\n'


def test_additive_schema_migration_preserves_old_rows_and_runs_twice(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'old.db'}")
    legacy = MetaData()
    for table in Base.metadata.sorted_tables:
        copy = table.to_metadata(legacy)
        names = ['is_active', 'token_version'] if table.name == 'users' else ['bank_account_encrypted', 'bank_account_last4'] if table.name == 'loan_applications' else []
        for name in names:
            copy._columns.remove(copy.c[name])
    legacy.create_all(engine)
    with engine.begin() as connection:
        connection.execute(text("INSERT INTO users (id,email,hashed_password,full_name,role,failed_login_count,created_at) VALUES ('legacy','old@branch.vn','!','Legacy','user',0,CURRENT_TIMESTAMP)"))
    ensure_schema(engine)
    ensure_schema(engine)
    assert {'bank_account_encrypted', 'bank_account_last4'} <= {column['name'] for column in inspect(engine).get_columns('loan_applications')}
    with engine.connect() as connection:
        assert tuple(connection.execute(text("SELECT full_name,is_active,token_version FROM users WHERE id='legacy'")).one()) == ('Legacy', 1, 0)
    engine.dispose()


def test_br5_simultaneous_requests_cannot_create_a_fourth_result(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'parallel.db'}", connect_args={'check_same_thread': False, 'timeout': 10})
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    with factory() as db:
        user = User(email='parallel@branch.vn', full_name='Parallel', hashed_password='!')
        db.add(user); db.flush()
        loan = LoanApplication(created_by=user.id, **VALID_APPLICATION)
        db.add(loan); db.commit()
        loan_id, user_id = loan.id, user.id
        score_application(db, loan, user)
        score_application(db, loan, user)
    ready = Barrier(2)
    def worker():
        with factory() as db:
            loan, user = db.get(LoanApplication, loan_id), db.get(User, user_id)
            ready.wait(timeout=5)
            try:
                score_application(db, loan, user)
                return 201
            except HTTPException as error:
                return error.status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(worker) for _ in range(2)]
        assert sorted(future.result(timeout=15) for future in futures) == [201, 429]
    with factory() as db:
        assert db.query(ScoringResult).filter_by(loan_application_id=loan_id).count() == 3
        assert db.get(LoanApplication, loan_id).status == LoanStatus.MANUAL_REVIEW
    engine.dispose()
