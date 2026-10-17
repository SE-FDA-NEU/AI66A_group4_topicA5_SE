"""Create local secrets once; never rotate a database encryption key implicitly."""
import os
import re
import secrets
import stat
from pathlib import Path

from cryptography.fernet import Fernet
from dotenv import dotenv_values

# Anchored to backend/, so the file lands next to .env.example whatever the
# current working directory is.
BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_ENV = BACKEND_DIR / '.env'
EXAMPLE_ENV = BACKEND_DIR / '.env.example'
PLACEHOLDER_JWT_SECRET = 'dev-only-change-me'


def _starting_text(path: Path) -> str:
    """The text to build on: the existing .env, else a copy of .env.example."""
    if path.exists():
        return path.read_text(encoding='utf-8')
    if EXAMPLE_ENV.exists():
        return EXAMPLE_ENV.read_text(encoding='utf-8')
    return 'DATABASE_URL=sqlite:///./credit_scoring.db\n'


def _set(text: str, name: str, value: str) -> str:
    pattern = rf'(?m)^\s*{re.escape(name)}\s*=.*$'
    line = f'{name}={value}'
    if re.search(pattern, text):
        # A lambda: a replacement string would interpret backslashes in the value.
        return re.sub(pattern, lambda _match: line, text, count=1)
    return text.rstrip('\n') + '\n' + line + '\n'


def initialize(path: Path = DEFAULT_ENV) -> bool:
    """Fill in missing local secrets. Returns True when the file was written.

    Idempotent: an existing DATA_ENCRYPTION_KEY is never replaced, because every
    identifier already in the database was encrypted with it.
    """
    path = Path(path)
    values = dotenv_values(path) if path.exists() else {}
    key = values.get('DATA_ENCRYPTION_KEY')
    if key:
        # Fail without overwriting anything if an existing key is invalid.
        try:
            Fernet(key.encode('ascii'))
        except (ValueError, UnicodeError):
            raise ValueError(
                'Existing encryption key is invalid; restore the original key. '
                'No file was changed.'
            ) from None

    updates = {}
    if not key:
        updates['DATA_ENCRYPTION_KEY'] = Fernet.generate_key().decode('ascii')
    jwt_secret = values.get('JWT_SECRET')
    if not jwt_secret or jwt_secret == PLACEHOLDER_JWT_SECRET:
        updates['JWT_SECRET'] = secrets.token_urlsafe(48)
    if not updates:
        return False

    text = _starting_text(path)
    for name, value in updates.items():
        text = _set(text, name, value)
    # newline='\n': without it Windows writes CRLF and the file ends up with
    # mixed line endings after an in-place edit.
    path.write_text(text, encoding='utf-8', newline='\n')
    try:  # best effort: no-op on Windows
        os.chmod(path, stat.S_IRUSR | stat.S_IWUSR)
    except OSError:
        pass
    return True


if __name__ == '__main__':
    if initialize():
        print(
            f'Local secrets written to {DEFAULT_ENV} (values hidden). '
            'Keep this file with your database backup; do not commit it.'
        )
    else:
        print(
            f'{DEFAULT_ENV} already has an encryption key and a real JWT secret. '
            'Nothing was changed.'
        )
