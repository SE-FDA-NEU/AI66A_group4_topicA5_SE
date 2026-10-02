import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./credit_scoring.db")

@lru_cache
def get_settings() -> Settings:
    return Settings()
