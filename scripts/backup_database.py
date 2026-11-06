"""Encrypted pg_dump backup; neither connection credentials nor plaintext go to argv/files."""
import argparse
import os
import subprocess
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError


def _cipher(key: str) -> Fernet:
    try:
        return Fernet(key.encode("ascii"))
    except (ValueError, UnicodeError):
        raise RuntimeError("Set a valid BACKUP_ENCRYPTION_KEY and retain it separately from the archive.") from None


def _connection_env(database_url: str) -> dict:
    try:
        if database_url.startswith("postgres://"):
            database_url = "postgresql://" + database_url[len("postgres://"):]
        url = make_url(database_url)
        if url.get_backend_name() != "postgresql" or not all((url.host, url.username, url.database)):
            raise ValueError
        env = {**os.environ, "PGHOST": url.host, "PGPORT": str(url.port or 5432),
               "PGUSER": url.username, "PGDATABASE": url.database, "PGPASSWORD": url.password or ""}
        options = {"sslmode": "PGSSLMODE", "sslrootcert": "PGSSLROOTCERT", "sslcert": "PGSSLCERT",
                   "sslkey": "PGSSLKEY", "channel_binding": "PGCHANNELBINDING",
                   "connect_timeout": "PGCONNECT_TIMEOUT", "options": "PGOPTIONS"}
        for option, variable in options.items():
            value = url.query.get(option)
            if value is not None:
                if not isinstance(value, str):
                    raise ValueError
                env[variable] = value
        env.setdefault("PGSSLMODE", "require")
        env.setdefault("PGCONNECT_TIMEOUT", "5")
        return env
    except (ArgumentError, ValueError, TypeError):
        raise RuntimeError("Set a valid PostgreSQL DATABASE_URL with host, username and database.") from None


def create_backup(output: Path, database_url: str, key: str) -> None:
    cipher = _cipher(key)
    env = _connection_env(database_url)
    if output.exists():
        raise RuntimeError("Output exists; choose a new timestamped backup name.")
    command = [os.environ.get("PG_DUMP_PATH", "pg_dump"), "--format=custom", "--no-owner",
               "--no-acl", "--no-password"]
    try:
        result = subprocess.run(command, env=env, capture_output=True, check=False)
    except OSError:
        raise RuntimeError("Cannot run pg_dump; install a compatible PostgreSQL client or set PG_DUMP_PATH.") from None
    if result.returncode or not result.stdout.startswith(b"PGDMP"):
        raise RuntimeError("pg_dump failed; check the connection and client version. Connection details are withheld.")
    encrypted = cipher.encrypt(result.stdout)
    output.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation also prevents accidental overwrites between the check and write.
    with output.open("xb") as stream:
        stream.write(encrypted)


def verify_backup(source: Path, key: str) -> bytes:
    """Verify encryption and archive signature; full recovery still needs a test restore."""
    try:
        data = _cipher(key).decrypt(source.read_bytes())
    except InvalidToken:
        raise RuntimeError("Backup verification failed; check the key and archive integrity.") from None
    if not data.startswith(b"PGDMP"):
        raise RuntimeError("The decrypted data is not a PostgreSQL custom-format archive.")
    return data


def main():
    parser = argparse.ArgumentParser(description="Create or verify an encrypted PostgreSQL backup.")
    parser.add_argument("output", type=Path)
    parser.add_argument("--verify", action="store_true", help="Verify an existing backup without writing plaintext.")
    args = parser.parse_args()
    try:
        key = os.environ.get("BACKUP_ENCRYPTION_KEY", "")
        if args.verify:
            verify_backup(args.output, key)
            print("Backup encryption and archive signature verified; run a disposable-database restore separately.")
        else:
            create_backup(args.output, os.environ.get("DATABASE_URL", ""), key)
            print("Encrypted PostgreSQL backup created. Retain backup and identifier-encryption keys separately.")
    except RuntimeError as error:
        raise SystemExit(str(error)) from None
    except OSError:
        raise SystemExit("Cannot read/write the backup file; check its path, permissions and available space.") from None


if __name__ == "__main__":
    main()
