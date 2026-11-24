import json
import logging
from typing import Dict, List, Set, Any
from fastapi import WebSocket

logger = logging.getLogger("agrishield.websocket")

class ConnectionManager:
    def __init__(self):
        # admin connections
        self.admin_connections: Set[WebSocket] = set()
        # user/farmer connections: user_id -> Set[WebSocket]
        self.user_connections: Dict[int, Set[WebSocket]] = {}
        # device watchers: device_id -> Set[WebSocket]
        self.device_connections: Dict[int, Set[WebSocket]] = {}

    async def connect_admin(self, websocket: WebSocket):
        await websocket.accept()
        self.admin_connections.add(websocket)
        logger.info(f"Admin connected to WebSocket. Total admins: {len(self.admin_connections)}")

    def disconnect_admin(self, websocket: WebSocket):
        self.admin_connections.discard(websocket)
        logger.info(f"Admin disconnected from WebSocket. Remaining: {len(self.admin_connections)}")

    async def connect_user(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(websocket)
        logger.info(f"User {user_id} connected to WebSocket.")

    def disconnect_user(self, user_id: int, websocket: WebSocket):
        if user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        logger.info(f"User {user_id} disconnected from WebSocket.")

    async def broadcast_to_admins(self, message: Dict[str, Any]):
        payload = json.dumps(message)
        dead_sockets = set()
        for ws in self.admin_connections:
            try:
                await ws.send_text(payload)
            except Exception:
                dead_sockets.add(ws)
        for ws in dead_sockets:
            self.admin_connections.discard(ws)

    async def send_to_user(self, user_id: int, message: Dict[str, Any]):
        if user_id in self.user_connections:
            payload = json.dumps(message)
            dead_sockets = set()
            for ws in self.user_connections[user_id]:
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead_sockets.add(ws)
            for ws in dead_sockets:
                self.user_connections[user_id].discard(ws)

    async def broadcast_event(self, event_type: str, data: Dict[str, Any], target_user_id: int = None):
        """Broadcasts to all admins and optionally to the relevant farmer."""
        msg = {
            "type": event_type,
            "data": data
        }
        await self.broadcast_to_admins(msg)
        if target_user_id:
            await self.send_to_user(target_user_id, msg)

ws_manager = ConnectionManager()
