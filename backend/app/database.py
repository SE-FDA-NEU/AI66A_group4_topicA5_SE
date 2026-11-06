import sqlite3

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import get_settings
from app.deployment import normalize_database_url

settings = get_settings()

database_url = normalize_database_url(settings.DATABASE_URL)
connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
if database_url.startswith("postgresql"):
    connect_args["connect_timeout"] = 5
engine = create_engine(database_url, connect_args=connect_args, pool_pre_ping=True, hide_parameters=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


@event.listens_for(Engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
