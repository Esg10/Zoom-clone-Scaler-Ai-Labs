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
        # Sockets of participants in the waiting room: connected, but they
        # neither receive room broadcasts nor count as present.
        self.lobby: Dict[str, Dict[int, WebSocket]] = defaultdict(dict)
        self.screen_sharer: Dict[str, int] = {}
        self._auto_end_tasks: Dict[str, asyncio.Task] = {}

    async def connect(self, code: str, participant_id: int, websocket: WebSocket, waiting: bool = False) -> None:
        self._cancel_auto_end(code)
        target = self.lobby if waiting else self.rooms
        previous = target[code].get(participant_id)
        target[code][participant_id] = websocket
        if previous is not None:
            # Same participant opened a second socket (e.g. React dev double-mount); keep the newest.
            await self._safe_close(previous)

    def disconnect(self, code: str, participant_id: int, websocket: WebSocket) -> bool:
        """Unregister a socket. Returns False if a newer socket already replaced it."""
        for registry in (self.rooms, self.lobby):
            group = registry.get(code, {})
            if group.get(participant_id) is websocket:
                del group[participant_id]
                if not group:
                    registry.pop(code, None)
                if self.screen_sharer.get(code) == participant_id:
                    del self.screen_sharer[code]
                return True
        return False

    def admit(self, code: str, participant_id: int) -> bool:
        """Move a waiting socket into the room. False if they're not connected."""
        websocket = self.lobby.get(code, {}).pop(participant_id, None)
        if websocket is None:
            return False
        self.rooms[code][participant_id] = websocket
        return True

    def lobby_ids(self, code: str) -> List[int]:
        return list(self.lobby.get(code, {}).keys())

    def is_admitted(self, code: str, participant_id: int) -> bool:
        return participant_id in self.rooms.get(code, {})

    def _find(self, code: str, participant_id: int) -> Optional[WebSocket]:
        return self.rooms.get(code, {}).get(participant_id) or self.lobby.get(code, {}).get(participant_id)

    def connected_ids(self, code: str) -> List[int]:
        return list(self.rooms.get(code, {}).keys())

    def is_empty(self, code: str) -> bool:
        return not self.rooms.get(code)

    async def send(self, code: str, participant_id: int, message: Message) -> None:
        websocket = self._find(code, participant_id)
        if websocket is not None:
            await self._safe_send(websocket, message)

    async def broadcast(self, code: str, message: Message, exclude: Optional[int] = None) -> None:
        targets = [ws for pid, ws in list(self.rooms.get(code, {}).items()) if pid != exclude]
        await asyncio.gather(*(self._safe_send(ws, message) for ws in targets))

    async def kick(self, code: str, participant_id: int, message: Message) -> None:
        """Tell one participant why they're leaving, then close their socket."""
        websocket = self._find(code, participant_id)
        if websocket is not None:
            self.disconnect(code, participant_id, websocket)
            await self._safe_send(websocket, message)
            await self._safe_close(websocket)

    async def close_room(self, code: str, message: Message) -> None:
        sockets = list(self.rooms.pop(code, {}).values()) + list(self.lobby.pop(code, {}).values())
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
