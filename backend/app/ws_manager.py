import asyncio
import json
from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    """Управляет WebSocket-подключениями по slug вишлиста."""

    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, slug: str) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[slug].add(websocket)

    async def disconnect(self, websocket: WebSocket, slug: str) -> None:
        async with self._lock:
            self._connections[slug].discard(websocket)
            if not self._connections[slug]:
                del self._connections[slug]

    async def broadcast_wishlist(self, slug: str, data: dict) -> None:
        """Отправить обновлённый вишлист всем подключённым по slug."""
        async with self._lock:
            connections = list(self._connections.get(slug, []))
        msg = json.dumps(data, default=str)
        disconnected = []
        for ws in connections:
            try:
                await ws.send_text(msg)
            except Exception:
                disconnected.append(ws)
        if disconnected:
            async with self._lock:
                for ws in disconnected:
                    self._connections[slug].discard(ws)


manager = ConnectionManager()
