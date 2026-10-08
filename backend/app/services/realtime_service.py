"""WebSocket message protocol: handles client messages and pushes server events.

Client -> server message types:
    signal        {to, data}               WebRTC offer/answer/ICE relayed to one peer
    media-state   {is_muted?, is_video_on?}
    screen-share  {active}
    chat          {content}
    reaction      {emoji}

Server -> client message types:
    welcome, participant-joined, participant-left, participant-updated, signal,
    screen-share, chat, reaction, muted-by-host, removed, meeting-ended, error
"""
import logging
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.config import EMPTY_MEETING_GRACE_SECONDS
from app.database import SessionLocal
from app.errors import AppError
from app.models import Meeting, MeetingStatus, Participant
from app.schemas import ChatMessageOut, MeetingOut, ParticipantOut
from app.services import meeting_service, participant_service
from app.services.connection_manager import manager

logger = logging.getLogger(__name__)

MAX_CHAT_LENGTH = 2000
ALLOWED_REACTIONS = {"👏", "👍", "❤️", "😂", "😮", "🎉"}


def participant_payload(code: str, participant: Participant) -> Dict[str, Any]:
    data = ParticipantOut.model_validate(participant).model_dump(mode="json")
    data["is_sharing"] = manager.screen_sharer.get(code) == participant.id
    return data


def chat_payload(message) -> Dict[str, Any]:
    return ChatMessageOut.model_validate(message).model_dump(mode="json")


# ---------- Connection lifecycle ----------

async def on_connect(db: Session, meeting: Meeting, participant: Participant) -> None:
    code = meeting.meeting_code
    participant_service.mark_present(db, participant)
    present = participant_service.list_present(db, meeting, manager.connected_ids(code))
    await manager.send(code, participant.id, {
        "type": "welcome",
        "self_id": participant.id,
        "meeting": MeetingOut.model_validate(meeting).model_dump(mode="json"),
        "participants": [participant_payload(code, p) for p in present],
        "messages": [chat_payload(m) for m in participant_service.recent_chat(db, meeting)],
    })
    await manager.broadcast(
        code, {"type": "participant-joined", "participant": participant_payload(code, participant)},
        exclude=participant.id,
    )


async def on_disconnect(db: Session, meeting: Meeting, participant: Participant) -> None:
    code = meeting.meeting_code
    db.refresh(participant)
    if participant.left_at is None:
        participant_service.mark_left(db, participant)
    await manager.broadcast(code, {"type": "participant-left", "participant_id": participant.id})
    if manager.is_empty(code):
        manager.schedule_auto_end(code, EMPTY_MEETING_GRACE_SECONDS, lambda: _auto_end(code))


async def _auto_end(code: str) -> None:
    db = SessionLocal()
    try:
        meeting = meeting_service.get_meeting(db, code)
        if meeting.status == MeetingStatus.live:
            meeting_service.end_meeting(db, meeting)
            logger.info("Auto-ended empty meeting %s", code)
    finally:
        db.close()


# ---------- Client messages ----------

async def handle_message(db: Session, code: str, sender: Participant, message: Dict[str, Any]) -> None:
    handler = _HANDLERS.get(message.get("type"))
    if handler is None:
        raise AppError(400, "unknown_message", f"Unknown message type: {message.get('type')}")
    await handler(db, code, sender, message)


async def _relay_signal(db: Session, code: str, sender: Participant, message: Dict[str, Any]) -> None:
    # The server never inspects SDP/ICE payloads; it only forwards them to the target peer.
    target = message.get("to")
    if isinstance(target, int):
        await manager.send(code, target, {"type": "signal", "from": sender.id, "data": message.get("data")})


async def _media_state(db: Session, code: str, sender: Participant, message: Dict[str, Any]) -> None:
    participant_service.set_media_state(db, sender, message.get("is_muted"), message.get("is_video_on"))
    await manager.broadcast(code, {"type": "participant-updated", "participant": participant_payload(code, sender)})


async def _screen_share(db: Session, code: str, sender: Participant, message: Dict[str, Any]) -> None:
    if message.get("active"):
        manager.screen_sharer[code] = sender.id  # a new share replaces any existing one
    elif manager.screen_sharer.get(code) == sender.id:
        del manager.screen_sharer[code]
    await manager.broadcast(code, {"type": "screen-share", "participant_id": manager.screen_sharer.get(code)})


async def _chat(db: Session, code: str, sender: Participant, message: Dict[str, Any]) -> None:
    content = str(message.get("content", "")).strip()[:MAX_CHAT_LENGTH]
    if content:
        saved = participant_service.add_chat_message(db, sender, content)
        await manager.broadcast(code, {"type": "chat", "message": chat_payload(saved)})


async def _reaction(db: Session, code: str, sender: Participant, message: Dict[str, Any]) -> None:
    emoji = message.get("emoji")
    if emoji in ALLOWED_REACTIONS:
        await manager.broadcast(code, {"type": "reaction", "participant_id": sender.id, "emoji": emoji})


_HANDLERS = {
    "signal": _relay_signal,
    "media-state": _media_state,
    "screen-share": _screen_share,
    "chat": _chat,
    "reaction": _reaction,
}


# ---------- Server-initiated events (called from REST host controls) ----------

async def notify_muted(code: str, participant_ids: List[int]) -> None:
    await manager.broadcast(code, {"type": "muted-by-host", "participant_ids": participant_ids})


async def notify_removed(code: str, participant_id: int) -> None:
    await manager.kick(code, participant_id, {"type": "removed"})
    await manager.broadcast(code, {"type": "participant-left", "participant_id": participant_id})


async def notify_meeting_ended(code: str) -> None:
    await manager.close_room(code, {"type": "meeting-ended"})
