"""WebSocket endpoint used for signaling, presence, chat and host actions."""
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.database import SessionLocal
from app.errors import AppError
from app.services import meeting_service, participant_service, realtime_service
from app.services.connection_manager import manager

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws/meetings/{code}")
async def meeting_socket(websocket: WebSocket, code: str, participant_id: int, token: str = ""):
    # One DB session for the lifetime of this socket (SQLite calls are short).
    db = SessionLocal()
    await websocket.accept()
    try:
        meeting = meeting_service.get_meeting(db, code)
        participant = participant_service.get_for_socket(db, meeting, participant_id, token)
    except AppError as exc:
        # Accept-then-close so the browser gets a readable reason; close code is 4000 + HTTP status.
        await websocket.send_json({"type": "error", "code": exc.code, "message": exc.message})
        await websocket.close(code=4000 + exc.status_code)
        db.close()
        return

    code = meeting.meeting_code
    await manager.connect(code, participant.id, websocket, waiting=not participant.is_admitted)
    try:
        await realtime_service.on_connect(db, meeting, participant)
        while True:
            message = await websocket.receive_json()
            if message.get("type") == "leave":
                # Explicit leave: clean up now. Some proxies (e.g. Render's) take
                # ~10 s to pass on a WebSocket close, so others would see us late.
                break
            try:
                await realtime_service.handle_message(db, code, participant, message)
            except AppError as exc:
                await websocket.send_json({"type": "error", "code": exc.code, "message": exc.message})
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("WebSocket error for participant %s", participant.id)
    finally:
        # Only clean up if this socket wasn't already replaced/kicked by the server.
        if manager.disconnect(code, participant.id, websocket):
            await realtime_service.on_disconnect(db, meeting, participant)
        db.close()
