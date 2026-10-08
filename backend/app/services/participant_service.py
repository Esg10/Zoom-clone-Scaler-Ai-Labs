"""Participant lifecycle: joining, presence, media state and host moderation."""
from typing import Iterable, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import utcnow
from app.errors import AppError
from app.models import ChatMessage, Meeting, MeetingStatus, Participant, ParticipantRole, User
from app.schemas import HostActionRequest, JoinRequest
from app.security import hash_token, new_token, token_matches
from app.services import meeting_service

MODERATOR_ROLES = (ParticipantRole.host, ParticipantRole.co_host)


def join(db: Session, meeting: Meeting, data: JoinRequest, user: Optional[User]) -> Tuple[Participant, str]:
    """Create a participant and return it with its secret token (only shown once)."""
    # The role comes from the verified login, never from the request body.
    is_host = user is not None and user.id == meeting.host_id
    meeting_service.ensure_joinable(meeting, data.passcode, is_host=is_host)
    meeting_service.mark_live(db, meeting)

    token = new_token()
    participant = Participant(
        meeting_id=meeting.id,
        user_id=user.id if user else None,
        token_hash=hash_token(token),
        display_name=data.display_name,
        role=ParticipantRole.host if is_host else ParticipantRole.attendee,
        is_muted=meeting.mute_on_entry and not is_host,
        is_video_on=data.is_video_on,
        is_admitted=is_host or not meeting.waiting_room_enabled,
    )
    db.add(participant)
    db.commit()
    return participant, token


def get_participant(db: Session, meeting: Meeting, participant_id: int) -> Participant:
    participant = db.get(Participant, participant_id)
    if participant is None or participant.meeting_id != meeting.id:
        raise AppError(404, "participant_not_found", "Participant not found in this meeting")
    return participant


def authenticate(db: Session, meeting: Meeting, participant_id: int, token: str) -> Participant:
    """Prove the caller is this participant by checking its secret token."""
    participant = get_participant(db, meeting, participant_id)
    if not participant.token_hash or not token_matches(token, participant.token_hash):
        raise AppError(403, "invalid_participant_token", "Your meeting session is not valid. Please rejoin.")
    return participant


def get_for_socket(db: Session, meeting: Meeting, participant_id: int, token: str) -> Participant:
    """Checks performed before a participant may open the meeting's WebSocket."""
    participant = authenticate(db, meeting, participant_id, token)
    if participant.is_removed:
        raise AppError(403, "removed", "You have been removed from this meeting")
    if meeting.status != MeetingStatus.live:
        raise AppError(410, "meeting_not_live", "This meeting is not in progress")
    return participant


def require_moderator(db: Session, meeting: Meeting, request: HostActionRequest) -> Participant:
    actor = authenticate(db, meeting, request.participant_id, request.participant_token)
    if actor.role not in MODERATOR_ROLES or actor.is_removed:
        raise AppError(403, "not_host", "Only the host can do that")
    return actor


def list_by_ids(db: Session, meeting: Meeting, participant_ids: Iterable[int]) -> List[Participant]:
    """This meeting's participants with the given ids (e.g. those connected right now)."""
    ids = list(participant_ids)
    if not ids:
        return []
    return list(
        db.scalars(
            select(Participant)
            .where(Participant.meeting_id == meeting.id, Participant.id.in_(ids))
            .order_by(Participant.joined_at)
        ).all()
    )


def mark_present(db: Session, participant: Participant) -> None:
    participant.left_at = None
    db.commit()


def mark_left(db: Session, participant: Participant) -> None:
    participant.left_at = utcnow()
    db.commit()


def set_media_state(db: Session, participant: Participant, is_muted=None, is_video_on=None) -> Participant:
    if isinstance(is_muted, bool):
        participant.is_muted = is_muted
    if isinstance(is_video_on, bool):
        participant.is_video_on = is_video_on
    db.commit()
    return participant


def mute(db: Session, participants: Iterable[Participant]) -> List[int]:
    muted = []
    for participant in participants:
        participant.is_muted = True
        muted.append(participant.id)
    db.commit()
    return muted


def mute_all(db: Session, meeting: Meeting, connected_ids: Iterable[int]) -> List[int]:
    """Mute everyone present except moderators (Zoom behaviour)."""
    targets = [p for p in list_by_ids(db, meeting, connected_ids) if p.role not in MODERATOR_ROLES]
    return mute(db, targets)


def admit(db: Session, meeting: Meeting, target_id: int) -> Participant:
    target = get_participant(db, meeting, target_id)
    if target.is_removed:
        raise AppError(409, "participant_removed", "This participant was removed from the meeting")
    target.is_admitted = True
    db.commit()
    return target


def remove(db: Session, meeting: Meeting, actor: Participant, target_id: int) -> Participant:
    target = get_participant(db, meeting, target_id)
    if target.id == actor.id:
        raise AppError(400, "cannot_remove_self", "You can't remove yourself; use Leave instead")
    if target.role == ParticipantRole.host:
        raise AppError(403, "cannot_remove_host", "The host can't be removed")
    target.is_removed = True
    target.left_at = utcnow()
    db.commit()
    return target


def add_chat_message(db: Session, participant: Participant, content: str) -> ChatMessage:
    message = ChatMessage(meeting_id=participant.meeting_id, participant_id=participant.id, content=content)
    db.add(message)
    db.commit()
    return message


def recent_chat(db: Session, meeting: Meeting, limit: int = 100) -> List[ChatMessage]:
    latest = db.scalars(
        select(ChatMessage)
        .where(ChatMessage.meeting_id == meeting.id)
        .order_by(ChatMessage.sent_at.desc(), ChatMessage.id.desc())
        .limit(limit)
    ).all()
    return list(reversed(latest))
