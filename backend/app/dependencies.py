"""FastAPI dependencies for the signed-in user (from an `Authorization: Bearer` header)."""
from typing import Optional

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import AppError
from app.models import User
from app.services import auth_service

bearer = HTTPBearer(auto_error=False)


def bearer_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> Optional[str]:
    return credentials.credentials if credentials else None


def optional_user(token: Optional[str] = Depends(bearer_token), db: Session = Depends(get_db)) -> Optional[User]:
    """The signed-in user, or None for guests (e.g. joining via an invite link)."""
    return auth_service.user_for_token(db, token) if token else None


def current_user(user: Optional[User] = Depends(optional_user)) -> User:
    """Like optional_user, but the endpoint requires being signed in."""
    if user is None:
        raise AppError(401, "not_authenticated", "Please sign in to continue.")
    return user
