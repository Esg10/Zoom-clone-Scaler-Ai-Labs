"""In-memory registry of live WebSocket connections, grouped by meeting code.

This is the signaling hub: it only routes JSON messages between participants.
Media itself flows peer-to-peer over WebRTC and never touches the server.
(Single-process only; scaling out would need a pub/sub backend such as Redis.)
"""
import asyncio
import logging
from collections import defaultdict
from typing import Any, Awaitable, Callable, Dict, List, Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)

Message = Dict[str, Any]


class ConnectionManager:
    def __init__(self) -> None:
        self.rooms: Dict[str, Dict[int, WebSocket]] = defaultdict(dict)
        self.screen_sharer: Dict[str, int] = {}
        self._auto_end_tasks: Dict[str, asyncio.Task] = {}

    async def connect(self, code: str, participant_id: int, websocket: WebSocket) -> None:
        self._cancel_auto_end(code)
        previous = self.rooms[code].get(participant_id)
        self.rooms[code][participant_id] = websocket
        if previous is not None:
            # Same participant opened a second socket (e.g. React dev double-mount); keep the newest.
            await self._safe_close(previous)

    def disconnect(self, code: str, participant_id: int, websocket: WebSocket) -> bool:
        """Unregister a socket. Returns False if a newer socket already replaced it."""
        room = self.rooms.get(code, {})
        if room.get(participant_id) is not websocket:
            return False
        del room[participant_id]
        if self.screen_sharer.get(code) == participant_id:
            del self.screen_sharer[code]
        if not room:
            self.rooms.pop(code, None)
        return True

    def connected_ids(self, code: str) -> List[int]:
        return list(self.rooms.get(code, {}).keys())

    def is_empty(self, code: str) -> bool:
        return not self.rooms.get(code)

    async def send(self, code: str, participant_id: int, message: Message) -> None:
        websocket = self.rooms.get(code, {}).get(participant_id)
        if websocket is not None:
            await self._safe_send(websocket, message)

    async def broadcast(self, code: str, message: Message, exclude: Optional[int] = None) -> None:
        targets = [ws for pid, ws in list(self.rooms.get(code, {}).items()) if pid != exclude]
        await asyncio.gather(*(self._safe_send(ws, message) for ws in targets))

    async def kick(self, code: str, participant_id: int, message: Message) -> None:
        """Tell one participant why they're leaving, then close their socket."""
        websocket = self.rooms.get(code, {}).get(participant_id)
        if websocket is not None:
            self.disconnect(code, participant_id, websocket)
            await self._safe_send(websocket, message)
            await self._safe_close(websocket)

    async def close_room(self, code: str, message: Message) -> None:
        sockets = list(self.rooms.pop(code, {}).values())
        self.screen_sharer.pop(code, None)
        self._cancel_auto_end(code)
        for websocket in sockets:
            await self._safe_send(websocket, message)
            await self._safe_close(websocket)

    def schedule_auto_end(self, code: str, delay: float, on_expire: Callable[[], Awaitable[None]]) -> None:
        """Run `on_expire` after `delay` seconds unless someone reconnects first."""
        self._cancel_auto_end(code)

        async def _wait_then_end() -> None:
            await asyncio.sleep(delay)
            self._auto_end_tasks.pop(code, None)
            if self.is_empty(code):
                await on_expire()

        self._auto_end_tasks[code] = asyncio.create_task(_wait_then_end())

    def _cancel_auto_end(self, code: str) -> None:
        task = self._auto_end_tasks.pop(code, None)
        if task is not None:
            task.cancel()

    @staticmethod
    async def _safe_send(websocket: WebSocket, message: Message) -> None:
        try:
            await websocket.send_json(message)
        except Exception:  # socket already closing; the receive loop will clean up
            logger.debug("Dropped message to closed socket")

    @staticmethod
    async def _safe_close(websocket: WebSocket) -> None:
        try:
            await websocket.close()
        except Exception:
            pass


manager = ConnectionManager()
