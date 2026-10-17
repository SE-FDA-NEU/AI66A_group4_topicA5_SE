"""Small additive migration for existing M2/M3 SQLite or PostgreSQL databases."""
from sqlalchemy import inspect, text

from app import models  # noqa: F401
from app.database import Base, engine


def ensure_schema(bind=engine):
    Base.metadata.create_all(bind)
    additions = {
        'users': {'is_active': 'BOOLEAN NOT NULL DEFAULT TRUE', 'token_version': 'INTEGER NOT NULL DEFAULT 0'},
        # BR7: nullable, so rows created before Sprint 3 keep their data and read as
        # "no identifier provided" instead of needing a backfill.
        'loan_applications': {
            'citizen_id_encrypted': 'VARCHAR NULL',
            'citizen_id_last4': 'VARCHAR(4) NULL',
            'bank_account_encrypted': 'VARCHAR NULL',
            'bank_account_last4': 'VARCHAR(4) NULL',
        },
    }
    with bind.begin() as connection:
        for table, columns in additions.items():
            existing = {column['name'] for column in inspect(connection).get_columns(table)}
            for name, definition in columns.items():
                if name not in existing:
                    # All identifiers and definitions are fixed code, not user input.
                    connection.execute(text(f'ALTER TABLE {table} ADD COLUMN {name} {definition}'))


if __name__ == '__main__':
    ensure_schema()
    print('Schema upgraded; existing rows preserved.')
