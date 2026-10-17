import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./credit_scoring.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-only-change-me")
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))
    # BR7: Fernet key for identifiers at rest. Empty means "not configured":
    # app.privacy turns that into a 503 instead of crashing. Never defaults to a
    # literal key, which would silently encrypt production data with a shared secret.
    DATA_ENCRYPTION_KEY: str = os.getenv("DATA_ENCRYPTION_KEY", "")

@lru_cache
def get_settings() -> Settings:
    return Settings()
