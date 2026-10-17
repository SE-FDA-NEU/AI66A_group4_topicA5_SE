"""BR7: authenticated encryption; only masked identifiers enter audit records.

Identifiers are handled as digit *strings* from end to end. Parsing them as
integers would drop the leading zeros of a citizen ID such as 001234567890.
"""
import re

from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException

from app.config import get_settings

NOT_CONFIGURED = (
    'Identifier protection is not configured. Ask the administrator to run '
    'python -m app.init_secrets and restart the server.'
)
WRONG_KEY = (
    'The saved identifier cannot be opened with the configured key. '
    'Ask the administrator to restore the original encryption key.'
)

# field -> (allowed lengths, message shown to the officer)
IDENTIFIER_RULES = {
    'citizen_id': (
        frozenset({9, 12}),
        'Citizen ID must be 9 or 12 digits, with no spaces, letters or separators.',
    ),
    'bank_account': (
        frozenset(range(6, 21)),
        'Bank account must be 6 to 20 digits, with no spaces, letters or separators.',
    ),
}


def validate_identifier(field: str, value: str | None) -> str | None:
    """Clean one optional identifier.

    Returns the digit string to encrypt, or None when the field was left empty.
    Raises ValueError so Pydantic reports it as a 422 field error, next to the
    other form messages, rather than as a server error.
    """
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None  # optional: an empty box is not an error
    lengths, message = IDENTIFIER_RULES[field]
    # ASCII digits only: str.isdigit() also accepts other scripts' digits.
    if not re.fullmatch(r'[0-9]+', cleaned) or len(cleaned) not in lengths:
        raise ValueError(message)
    return cleaned


def cipher() -> Fernet:
    # getattr + "or ''" so a missing or None setting becomes a 503, not a 500.
    key = getattr(get_settings(), 'DATA_ENCRYPTION_KEY', '') or ''
    try:
        return Fernet(key.encode('ascii'))
    except (ValueError, UnicodeError, AttributeError, TypeError):
        raise HTTPException(503, NOT_CONFIGURED) from None


def encrypt_identifier(value: str | None) -> tuple[str | None, str | None]:
    """(ciphertext, last 4 digits). Callers store both; neither reveals the number."""
    if not value:
        return None, None
    if not re.fullmatch(r'[0-9]+', value):
        # Unreachable when validate_identifier ran first; guards a future caller
        # against a 500 from .encode('ascii') on non-ASCII input.
        raise HTTPException(422, 'Identifiers may contain digits only.')
    return cipher().encrypt(value.encode('ascii')).decode('ascii'), value[-4:]


def decrypt_identifier(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return cipher().decrypt(value.encode('ascii')).decode('ascii')
    except (InvalidToken, UnicodeError):
        raise HTTPException(503, WRONG_KEY) from None


def masked(last4: str | None) -> str | None:
    """A fixed-width mask: the real length of the identifier is not disclosed."""
    return f'********{last4}' if last4 else None
