"""Accounts and login sessions."""
import secrets
from datetime import timedelta
from typing import Optional, Tuple

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import SESSION_TTL_DAYS
from app.database import utcnow
from app.errors import AppError
from app.models import AuthSession, User
from app.schemas import LoginRequest, SignupRequest
from app.security import hash_password, hash_token, new_token, verify_password
from app.services.meeting_service import PERSONAL_ID_LENGTH, generate_unique_code

AVATAR_COLORS = ["#0B5CFF", "#E8590C", "#2F9E44", "#AE3EC9", "#1098AD", "#D6336C", "#5C7CFA", "#F59F00"]

# Verified against when the email is unknown, so failed logins take the same
# time whether or not the account exists (no user enumeration via timing).
_DUMMY_HASH = hash_password(secrets.token_urlsafe(16))


def signup(db: Session, data: SignupRequest) -> Tuple[User, str]:
    if db.scalar(select(User).where(User.email == data.email)):
        raise AppError(409, "email_taken", "An account with this email already exists. Sign in instead.")
    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        avatar_color=secrets.choice(AVATAR_COLORS),
        personal_meeting_id=generate_unique_code(db, PERSONAL_ID_LENGTH),
    )
    db.add(user)
    db.flush()
    return user, create_session(db, user)


def login(db: Session, data: LoginRequest) -> Tuple[User, str]:
    user = db.scalar(select(User).where(User.email == data.email))
    password_ok = verify_password(data.password, user.password_hash if user else _DUMMY_HASH)
    if user is None or not password_ok:
        # Same message for "no such email" and "wrong password".
        raise AppError(401, "invalid_credentials", "Incorrect email or password.")
    return user, create_session(db, user)


def create_session(db: Session, user: User) -> str:
    """Store a hashed session token and return the raw token (shown to the client once)."""
    token = new_token()
    db.add(AuthSession(user_id=user.id, token_hash=hash_token(token), expires_at=utcnow() + timedelta(days=SESSION_TTL_DAYS)))
    db.commit()
    return token


def user_for_token(db: Session, token: str) -> Optional[User]:
    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == hash_token(token)))
    if session is None or session.expires_at <= utcnow():
        return None
    return session.user


def logout(db: Session, token: str) -> None:
    db.execute(delete(AuthSession).where(AuthSession.token_hash == hash_token(token)))
    db.commit()
