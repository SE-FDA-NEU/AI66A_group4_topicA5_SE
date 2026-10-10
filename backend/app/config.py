import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./credit_scoring.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-only-change-me")
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))

@lru_cache
def get_settings() -> Settings:
    return Settings()
