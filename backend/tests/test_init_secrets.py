"""BR7 key handling: generate once, never silently rotate.

Rotating DATA_ENCRYPTION_KEY would make every identifier already in the
database unreadable, so these tests pin the "do not overwrite" behaviour.
"""
import pytest
from cryptography.fernet import Fernet
from dotenv import dotenv_values

from app.init_secrets import PLACEHOLDER_JWT_SECRET, initialize


@pytest.fixture
def env_file(tmp_path):
    return tmp_path / ".env"


def test_first_run_creates_a_usable_key(env_file):
    assert initialize(env_file) is True
    values = dotenv_values(env_file)
    # Accepted by Fernet, so it survived the file round trip intact.
    Fernet(values["DATA_ENCRYPTION_KEY"].encode("ascii"))
    assert values["JWT_SECRET"] not in (None, "", PLACEHOLDER_JWT_SECRET)


def test_second_run_changes_nothing(env_file):
    initialize(env_file)
    first = dotenv_values(env_file)
    before = env_file.read_text(encoding="utf-8")

    assert initialize(env_file) is False
    assert env_file.read_text(encoding="utf-8") == before
    assert dotenv_values(env_file) == first


def test_existing_key_is_kept_when_the_jwt_secret_is_rotated(env_file):
    key = Fernet.generate_key().decode("ascii")
    env_file.write_text(
        f"DATABASE_URL=sqlite:///./keep.db\n"
        f"JWT_SECRET={PLACEHOLDER_JWT_SECRET}\n"
        f"DATA_ENCRYPTION_KEY={key}\n",
        encoding="utf-8",
    )
    assert initialize(env_file) is True
    values = dotenv_values(env_file)
    assert values["DATA_ENCRYPTION_KEY"] == key          # untouched
    assert values["JWT_SECRET"] != PLACEHOLDER_JWT_SECRET  # rotated
    assert values["DATABASE_URL"] == "sqlite:///./keep.db"  # unrelated line kept


def test_an_empty_key_placeholder_is_filled_in(env_file):
    env_file.write_text("DATA_ENCRYPTION_KEY=\nJWT_SECRET=already-random-value\n", encoding="utf-8")
    assert initialize(env_file) is True
    values = dotenv_values(env_file)
    Fernet(values["DATA_ENCRYPTION_KEY"].encode("ascii"))
    assert values["JWT_SECRET"] == "already-random-value"


def test_an_invalid_key_raises_and_leaves_the_file_alone(env_file):
    env_file.write_text(
        "DATA_ENCRYPTION_KEY=not-a-valid-fernet-key\nDATABASE_URL=keep-me\n",
        encoding="utf-8",
    )
    before = env_file.read_text(encoding="utf-8")
    with pytest.raises(ValueError, match="restore the original key"):
        initialize(env_file)
    assert env_file.read_text(encoding="utf-8") == before


def test_key_is_not_duplicated_in_the_file(env_file):
    initialize(env_file)
    env_file.write_text(
        env_file.read_text(encoding="utf-8").replace(
            "JWT_SECRET=", f"JWT_SECRET={PLACEHOLDER_JWT_SECRET}\nJWT_SECRET_OLD="
        ),
        encoding="utf-8",
    )
    initialize(env_file)
    lines = env_file.read_text(encoding="utf-8").splitlines()
    assert sum(line.startswith("DATA_ENCRYPTION_KEY=") for line in lines) == 1


def test_generated_values_survive_the_file_format(env_file):
    """Fernet keys end in '=' and contain '-' and '_'; nothing may mangle them."""
    for _ in range(25):
        env_file.unlink(missing_ok=True)
        initialize(env_file)
        values = dotenv_values(env_file)
        Fernet(values["DATA_ENCRYPTION_KEY"].encode("ascii"))
        assert len(values["JWT_SECRET"]) >= 60
