"""Scan tracked files only; print locations/rule names, never matching values."""
import re
import subprocess
import sys
from pathlib import Path

RULES = {
    "aws_key": re.compile(r"AKIA[0-9A-Z]{16}"),
    "github_token": re.compile(r"(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{30,})"),
    "private_key": re.compile(r"-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----"),
    # Do not mistake errors.password = 'Password is required.' for a credential.
    "literal_credential": re.compile(r'''(?<![.\w])(?:password|JWT_SECRET|DATA_ENCRYPTION_KEY)\s*=\s*["']([^"']{6,})["']'''),
}
DEMO_VALUES = {"Demo@2026", "dev-only-change-me", "already-random-value", "not-a-valid-fernet-key"}


def scan(root):
    result = subprocess.run(["git", "ls-files", "-z"], cwd=root, check=True, capture_output=True)
    failures = []
    for relative in result.stdout.decode().split("\0"):
        if not relative:
            continue
        path = Path(relative)
        if path.name == ".env" or path.suffix.lower() in {".db", ".sql", ".sqlite", ".sqlite3", ".dump", ".pyc"}:
            failures.append((relative, 0, "forbidden_runtime_file"))
            continue
        if path.suffix == ".md" or relative == "scripts/check_secrets.py":
            continue
        try:
            content = (root / path).read_text(encoding="utf-8")
        except (UnicodeError, OSError):
            continue
        for number, line in enumerate(content.splitlines(), 1):
            for rule, expression in RULES.items():
                match = expression.search(line)
                if not match:
                    continue
                if rule == "literal_credential" and match.group(1) in DEMO_VALUES:
                    continue
                failures.append((relative, number, rule))
    return failures


if __name__ == "__main__":
    found = scan(Path.cwd())
    for relative, line, rule in found:
        print(f"{relative}:{line}: {rule}")
    print("Credential scan failed." if found else "Tracked-source credential scan clean.")
    sys.exit(bool(found))
