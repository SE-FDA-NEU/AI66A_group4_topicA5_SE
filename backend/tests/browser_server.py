"""Local browser-test server: disposable seeded SQLite, never the user's DB/key."""
import argparse
import os
import secrets
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

from cryptography.fernet import Fernet


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8016)
    args = parser.parse_args()
    with TemporaryDirectory(prefix="credit-p0-browser-") as temporary:
        database = Path(temporary) / "demo.db"
        os.environ["DATABASE_URL"] = f"sqlite:///{database.as_posix()}"
        os.environ["JWT_SECRET"] = secrets.token_urlsafe(48)
        os.environ["DATA_ENCRYPTION_KEY"] = Fernet.generate_key().decode("ascii")
        sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

        import uvicorn

        from app.database import SessionLocal, engine
        from app.main import app
        from app.migrate import ensure_schema
        from app.models import User
        from app.security import hash_password
        from app.seed import TEST_PASSWORD, seed_database

        ensure_schema(engine)
        with SessionLocal() as db:
            seed_database(db)
            db.add(User(email="p0.dashboard@branch.vn", full_name="P0 Dashboard Officer",
                        hashed_password=hash_password(TEST_PASSWORD)))
            db.commit()
        uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
