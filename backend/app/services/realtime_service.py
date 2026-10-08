"""WebSocket message protocol: handles client messages and pushes server events.

Client -> server message types:
    signal        {to, data}               WebRTC offer/answer/ICE relayed to one peer
    media-state   {is_muted?, is_video_on?}
    screen-share  {active}
    chat          {content}
    reaction      {emoji}

Server -> client message types:
    welcome, waiting, waiting-room, participant-joined, participant-left,
    participant-updated, signal, screen-share, chat, reaction, muted-by-host,
    removed, meeting-ended, error
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

def _waiting_payload(db: Session, meeting: Meeting) -> List[Dict[str, Any]]:
    waiting = participant_service.list_by_ids(db, meeting, manager.lobby_ids(meeting.meeting_code))
    return [ParticipantOut.model_validate(p).model_dump(mode="json") for p in waiting]


async def broadcast_waiting_room(db: Session, meeting: Meeting) -> None:
    """Send the current waiting-room list to everyone in the room (hosts render it)."""
    await manager.broadcast(meeting.meeting_code, {"type": "waiting-room", "participants": _waiting_payload(db, meeting)})


async def on_connect(db: Session, meeting: Meeting, participant: Participant) -> None:
    code = meeting.meeting_code
    participant_service.mark_present(db, participant)
    if not participant.is_admitted:
        await manager.send(code, participant.id, {"type": "waiting"})
        await broadcast_waiting_room(db, meeting)
        return

    present = participant_service.list_by_ids(db, meeting, manager.connected_ids(code))
    await manager.send(code, participant.id, {
        "type": "welcome",
        "self_id": participant.id,
        "meeting": MeetingOut.model_validate(meeting).model_dump(mode="json"),
        "participants": [participant_payload(code, p) for p in present],
        "waiting": _waiting_payload(db, meeting),
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
    if participant.is_admitted:
        await manager.broadcast(code, {"type": "participant-left", "participant_id": participant.id})
    else:
        await broadcast_waiting_room(db, meeting)
    if manager.is_empty(code):
        manager.schedule_auto_end(code, EMPTY_MEETING_GRACE_SECONDS, lambda: _auto_end(code))


async def _auto_end(code: str) -> None:
    db = SessionLocal()
    try:
        meeting = meeting_service.get_meeting(db, code)
        if meeting.status == MeetingStatus.live:
            meeting_service.end_meeting(db, meeting)
            logger.info("Auto-ended empty meeting %s", code)
            await manager.close_room(code, {"type": "meeting-ended"})  # releases anyone still waiting
    finally:
        db.close()


# ---------- Client messages ----------

async def handle_message(db: Session, code: str, sender: Participant, message: Dict[str, Any]) -> None:
    if not manager.is_admitted(code, sender.id):
        # Waiting-room participants may only update their mic/camera state
        # (persisted, not broadcast) so it's correct once they're admitted.
        if message.get("type") == "media-state":
            participant_service.set_media_state(db, sender, message.get("is_muted"), message.get("is_video_on"))
        return
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


async def notify_removed(db: Session, meeting: Meeting, participant_id: int) -> None:
    code = meeting.meeting_code
    was_admitted = manager.is_admitted(code, participant_id)
    await manager.kick(code, participant_id, {"type": "removed"})
    if was_admitted:
        await manager.broadcast(code, {"type": "participant-left", "participant_id": participant_id})
    else:
        await broadcast_waiting_room(db, meeting)


async def admit(db: Session, meeting: Meeting, participant: Participant) -> None:
    """Move a waiting participant into the room and run the normal join sequence."""
    if manager.admit(meeting.meeting_code, participant.id):
        await on_connect(db, meeting, participant)
    await broadcast_waiting_room(db, meeting)


async def notify_meeting_ended(code: str) -> None:
    await manager.close_room(code, {"type": "meeting-ended"})
