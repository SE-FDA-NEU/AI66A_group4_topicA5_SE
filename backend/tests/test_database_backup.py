"""Backup tests never connect to a real database or write an unencrypted dump."""
import importlib.util
from pathlib import Path
from types import SimpleNamespace

import pytest
from cryptography.fernet import Fernet


@pytest.fixture
def backup():
    path = Path(__file__).resolve().parents[2] / "scripts" / "backup_database.py"
    spec = importlib.util.spec_from_file_location("s501_backup", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_backup_encrypts_dump_keeps_connection_out_of_argv_and_verifies(tmp_path, monkeypatch, backup):
    seen = {}

    def fake_dump(command, **kwargs):
        seen.update(command=command, **kwargs)
        return SimpleNamespace(returncode=0, stdout=b"PGDMPsynthetic-archive", stderr=b"")

    monkeypatch.setattr(backup.subprocess, "run", fake_dump)
    path = tmp_path / "backups" / "demo.dump.fernet"
    key = Fernet.generate_key().decode()
    backup.create_backup(path, "postgresql+psycopg://test_user:synthetic%40value@localhost:5433/demo?sslmode=verify-full&channel_binding=require", key)
    assert path.read_bytes() != b"PGDMPsynthetic-archive"
    assert backup.verify_backup(path, key) == b"PGDMPsynthetic-archive"
    assert seen["env"]["PGPASSWORD"] == "synthetic@value"
    assert seen["env"]["PGPORT"] == "5433"
    assert seen["env"]["PGSSLMODE"] == "verify-full"
    assert seen["env"]["PGCHANNELBINDING"] == "require"
    assert not any("synthetic" in value or "test_user" in value for value in seen["command"])
    assert list(path.parent.iterdir()) == [path]


def test_existing_backup_is_not_overwritten(tmp_path, monkeypatch, backup):
    path = tmp_path / "keep.dump.fernet"
    path.write_bytes(b"existing archive")
    monkeypatch.setattr(backup.subprocess, "run", lambda *a, **k: pytest.fail("Existing output must not run pg_dump"))
    with pytest.raises(RuntimeError, match="Output exists"):
        backup.create_backup(path, "postgres://test@localhost/demo", Fernet.generate_key().decode())
    assert path.read_bytes() == b"existing archive"


@pytest.mark.parametrize("status,content", [(1, b""), (0, b"not-a-dump")])
def test_failed_dump_creates_no_backup_and_withholds_private_diagnostics(tmp_path, monkeypatch, backup, status, content):
    monkeypatch.setattr(backup.subprocess, "run", lambda *a, **k: SimpleNamespace(
        returncode=status, stdout=content, stderr=b"sensitive-connection-value"))
    path = tmp_path / "no.dump.fernet"
    with pytest.raises(RuntimeError) as error:
        backup.create_backup(path, "postgresql://test@localhost/demo", Fernet.generate_key().decode())
    assert "sensitive" not in str(error.value)
    assert not path.exists()


@pytest.mark.parametrize("url,key", [
    ("sqlite:///demo.db", None),
    ("invalid-sensitive-url", None),
    ("postgresql:///missing-host", None),
    ("postgresql://test@localhost/demo", "invalid-sensitive-key"),
])
def test_invalid_backup_configuration_is_rejected_without_echoing_inputs(tmp_path, backup, url, key):
    key = key or Fernet.generate_key().decode()
    with pytest.raises(RuntimeError) as error:
        backup.create_backup(tmp_path / "no.dump.fernet", url, key)
    assert "sensitive" not in str(error.value)


def test_wrong_key_or_corrupted_archive_fails_verification(tmp_path, backup):
    path = tmp_path / "corrupt.dump.fernet"
    correct = Fernet.generate_key()
    path.write_bytes(Fernet(correct).encrypt(b"PGDMPsynthetic"))
    with pytest.raises(RuntimeError, match="verification failed"):
        backup.verify_backup(path, Fernet.generate_key().decode())
    path.write_bytes(Fernet(correct).encrypt(b"not-a-postgres-dump"))
    with pytest.raises(RuntimeError, match="not a PostgreSQL"):
        backup.verify_backup(path, correct.decode())
