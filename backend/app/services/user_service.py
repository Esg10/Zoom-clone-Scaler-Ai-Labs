"""User lookups (single default user, since the app has no authentication)."""
from sqlalchemy.orm import Session

from app.config import DEFAULT_USER_ID
from app.errors import AppError
from app.models import User


def get_current_user(db: Session) -> User:
    user = db.get(User, DEFAULT_USER_ID)
    if user is None:
        raise AppError(500, "user_missing", "Default user not found; run the seed script")
    return user
