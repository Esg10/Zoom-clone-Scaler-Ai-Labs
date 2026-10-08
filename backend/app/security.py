"""Password hashing and random tokens, using only the standard library.

Passwords: PBKDF2-HMAC-SHA256 with a random per-user salt and 600,000
iterations (OWASP's recommendation), so brute-forcing a leaked hash is slow.
Stored like Django does: "pbkdf2_sha256$<iterations>$<salt>$<hash>".

Tokens (login sessions, participant tokens): random 256-bit strings. Only a
SHA-256 hash is stored, so a leaked database can't be used to impersonate anyone.
"""
import base64
import hashlib
import hmac
import secrets

ALGORITHM = "pbkdf2_sha256"
ITERATIONS = 600_000
SALT_BYTES = 16


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode()


def _derive(password: str, salt: bytes, iterations: int) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(SALT_BYTES)
    return f"{ALGORITHM}${ITERATIONS}${_b64(salt)}${_b64(_derive(password, salt, ITERATIONS))}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, iterations, salt, expected = stored.split("$")
        if algorithm != ALGORITHM:
            return False
        key = _derive(password, base64.urlsafe_b64decode(salt), int(iterations))
    except (ValueError, TypeError):
        return False
    # Constant-time comparison so timing doesn't reveal how much matched.
    return hmac.compare_digest(key, base64.urlsafe_b64decode(expected))


def new_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def token_matches(token: str, stored_hash: str) -> bool:
    return hmac.compare_digest(hash_token(token), stored_hash)
