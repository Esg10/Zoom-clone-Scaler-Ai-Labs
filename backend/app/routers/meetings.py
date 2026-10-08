"""Meeting REST endpoints. Handlers stay thin; logic lives in services."""
from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import current_user
from app.errors import AppError
from app.models import Meeting, User
from app.schemas import (
    ErrorDetail,
    HostActionRequest,
    InstantMeetingCreate,
    MeetingOut,
    MeetingUpdate,
    ScheduleMeetingCreate,
    ValidateRequest,
    ValidateResponse,
)
from app.services import meeting_service, participant_service, realtime_service

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


def owned_meeting(code: str, db: Session = Depends(get_db), user: User = Depends(current_user)) -> Meeting:
    meeting = meeting_service.get_meeting(db, code)
    if meeting.host_id != user.id:
        raise AppError(403, "not_owner", "Only the meeting host can change this meeting")
    return meeting


@router.post("/instant", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
def create_instant(
    body: InstantMeetingCreate = InstantMeetingCreate(),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    return meeting_service.create_instant_meeting(db, user, body.use_personal_meeting_id)


@router.post("/schedule", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
def schedule(body: ScheduleMeetingCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    return meeting_service.schedule_meeting(db, user, body)


@router.get("/upcoming", response_model=List[MeetingOut])
def upcoming(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return meeting_service.list_upcoming(db, user.id)


@router.get("/recent", response_model=List[MeetingOut])
def recent(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return meeting_service.list_recent(db, user.id)


@router.get("/{code}", response_model=MeetingOut)
def read_meeting(code: str, db: Session = Depends(get_db)):
    return meeting_service.get_meeting(db, code)


@router.post("/{code}/validate", response_model=ValidateResponse)
def validate(code: str, body: ValidateRequest, db: Session = Depends(get_db)):
    """Pre-join check. Reasons: meeting_not_found, meeting_ended, meeting_cancelled,
    passcode_required, invalid_passcode."""
    try:
        meeting = meeting_service.get_meeting(db, code)
        meeting_service.ensure_joinable(meeting, body.passcode)
    except AppError as exc:
        return ValidateResponse(ok=False, error=ErrorDetail(code=exc.code, message=exc.message))
    return ValidateResponse(ok=True, meeting=MeetingOut.model_validate(meeting))


@router.patch("/{code}", response_model=MeetingOut)
def update(body: MeetingUpdate, meeting: Meeting = Depends(owned_meeting), db: Session = Depends(get_db)):
    return meeting_service.update_meeting(db, meeting, body)


@router.delete("/{code}", response_model=MeetingOut)
def cancel(meeting: Meeting = Depends(owned_meeting), db: Session = Depends(get_db)):
    return meeting_service.cancel_meeting(db, meeting)


@router.post("/{code}/end", response_model=MeetingOut)
async def end(code: str, body: HostActionRequest, db: Session = Depends(get_db)):
    meeting = meeting_service.get_meeting(db, code)
    participant_service.require_moderator(db, meeting, body)
    meeting_service.end_meeting(db, meeting)
    await realtime_service.notify_meeting_ended(meeting.meeting_code)
    return meeting
