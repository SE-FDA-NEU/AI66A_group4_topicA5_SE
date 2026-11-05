"""Database/deployment configuration checks without secret values in errors."""
from cryptography.fernet import Fernet
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError


def normalize_database_url(value: str) -> str:
    """Use psycopg 3 for the common URLs supplied by PostgreSQL hosts."""
    for prefix in ("postgres://", "postgresql://"):
        if value.startswith(prefix):
            return "postgresql+psycopg://" + value[len(prefix):]
    return value


def validate_production(settings):
    if settings.APP_ENV != "production":
        return
    try:
        backend = make_url(normalize_database_url(settings.DATABASE_URL)).get_backend_name()
    except (ArgumentError, ValueError):
        raise RuntimeError("Set a valid PostgreSQL DATABASE_URL on the hosting platform.") from None
    if backend != "postgresql":
        raise RuntimeError("Production requires a persistent PostgreSQL DATABASE_URL.")
    if len(settings.JWT_SECRET) < 32 or settings.JWT_SECRET == "dev-only-change-me":
        raise RuntimeError("Set a random JWT_SECRET of at least 32 characters on the hosting platform.")
    try:
        Fernet(settings.DATA_ENCRYPTION_KEY.encode("ascii"))
    except (ValueError, UnicodeError):
        raise RuntimeError("Set a valid, persistent DATA_ENCRYPTION_KEY on the hosting platform.") from None
