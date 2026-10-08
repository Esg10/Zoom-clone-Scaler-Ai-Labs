"""Sign up, sign in and sign out."""
from typing import Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import bearer_token
from app.schemas import AuthResponse, LoginRequest, SignupRequest, UserOut
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    user, token = auth_service.signup(db, body)
    return AuthResponse(token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user, token = auth_service.login(db, body)
    return AuthResponse(token=token, user=UserOut.model_validate(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(token: Optional[str] = Depends(bearer_token), db: Session = Depends(get_db)):
    if token:
        auth_service.logout(db, token)
