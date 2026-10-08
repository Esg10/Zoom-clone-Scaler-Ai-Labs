"""Joining a meeting, listing participants and host moderation controls."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import HostActionRequest, JoinRequest, JoinResponse, MeetingOut, ParticipantList, ParticipantOut
from app.services import meeting_service, participant_service, realtime_service
from app.services.connection_manager import manager

router = APIRouter(prefix="/api/meetings/{code}", tags=["participants"])


@router.post("/join", response_model=JoinResponse, status_code=status.HTTP_201_CREATED)
def join(code: str, body: JoinRequest, db: Session = Depends(get_db)):
    meeting = meeting_service.get_meeting(db, code)
    participant = participant_service.join(db, meeting, body)
    return JoinResponse(
        participant=ParticipantOut.model_validate(participant),
        meeting=MeetingOut.model_validate(meeting),
    )


@router.get("/participants", response_model=ParticipantList)
def list_participants(code: str, db: Session = Depends(get_db)):
    """Participants currently connected to the meeting."""
    meeting = meeting_service.get_meeting(db, code)
    present = participant_service.list_by_ids(db, meeting, manager.connected_ids(meeting.meeting_code))
    return ParticipantList(participants=present)


@router.post("/mute-all")
async def mute_all(code: str, body: HostActionRequest, db: Session = Depends(get_db)):
    meeting = meeting_service.get_meeting(db, code)
    participant_service.require_moderator(db, meeting, body.participant_id)
    muted = participant_service.mute_all(db, meeting, manager.connected_ids(meeting.meeting_code))
    await realtime_service.notify_muted(meeting.meeting_code, muted)
    return {"ok": True, "muted": muted}


@router.post("/participants/{participant_id}/mute")
async def mute_one(code: str, participant_id: int, body: HostActionRequest, db: Session = Depends(get_db)):
    meeting = meeting_service.get_meeting(db, code)
    participant_service.require_moderator(db, meeting, body.participant_id)
    target = participant_service.get_participant(db, meeting, participant_id)
    muted = participant_service.mute(db, [target])
    await realtime_service.notify_muted(meeting.meeting_code, muted)
    return {"ok": True, "muted": muted}


@router.post("/participants/{participant_id}/remove")
async def remove(code: str, participant_id: int, body: HostActionRequest, db: Session = Depends(get_db)):
    meeting = meeting_service.get_meeting(db, code)
    actor = participant_service.require_moderator(db, meeting, body.participant_id)
    target = participant_service.remove(db, meeting, actor, participant_id)
    await realtime_service.notify_removed(db, meeting, target.id)
    return {"ok": True, "removed": target.id}


@router.post("/participants/{participant_id}/admit")
async def admit(code: str, participant_id: int, body: HostActionRequest, db: Session = Depends(get_db)):
    """Let a participant in from the waiting room."""
    meeting = meeting_service.get_meeting(db, code)
    participant_service.require_moderator(db, meeting, body.participant_id)
    target = participant_service.admit(db, meeting, participant_id)
    await realtime_service.admit(db, meeting, target)
    return {"ok": True, "admitted": target.id}
