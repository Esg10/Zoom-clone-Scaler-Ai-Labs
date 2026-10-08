from fastapi import APIRouter, Depends

from app.dependencies import current_user
from app.models import User
from app.schemas import UserOut

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def read_me(user: User = Depends(current_user)):
    return user
