import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import User, UserRole, Device, DeviceStatus, UserSettings
from app.security import hash_password, hash_device_key, decode_token
from app.websocket_manager import ws_manager

# Import routers
from app.routers import (
    auth, devices, telemetry, camera, pump, gps, emergency, reports, farmers, settings as settings_router
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("agrishield.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables are created
    logger.info("Initializing AgriShield database schema...")
    Base.metadata.create_all(bind=engine)

    # Safe column migration check for is_verified on existing users table
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            # Check SQLite pragma
            res = conn.execute(text("PRAGMA table_info(users)")).fetchall()
            cols = [r[1] for r in res]
            if cols and "is_verified" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 1"))
                conn.commit()
                logger.info("Migrated existing users table: added is_verified column.")
    except Exception as me:
        logger.debug(f"Migration check completed: {me}")

    # Seed initial Admin and Demo Hardware if not present
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if not admin_user:
            logger.info("Creating initial AgriShield Administrator account...")
            admin_user = User(
                email="admin@agrishield.io",
                hashed_password=hash_password("Admin@AgriShield2026"),
                role=UserRole.ADMIN,
                is_active=True,
                is_verified=True
            )
            db.add(admin_user)
            db.flush()

            admin_settings = UserSettings(user_id=admin_user.id, language="en", theme="dark")
            db.add(admin_settings)
            db.commit()
            logger.info("Default Admin created: admin@agrishield.io / Admin@AgriShield2026")
        else:
            if not getattr(admin_user, 'is_verified', False):
                admin_user.is_verified = True
                db.commit()

        # Seed initial official hardware device
        sample_device = db.query(Device).filter(Device.device_uid == "ESP32_AGRI_01").first()
        if not sample_device:
            logger.info("Registering official hardware unit: ESP32_AGRI_01...")
            sample_device = Device(
                device_uid="ESP32_AGRI_01",
                name="ESP32 DevKit V1 - Field Unit 1",
                device_type="TELEMETRY_CONTROLLER",
                api_key_hash=hash_device_key("agrishield_secret_key_2026"),
                status=DeviceStatus.OFFLINE
            )
            db.add(sample_device)
            db.commit()
            logger.info("Hardware Unit ESP32_AGRI_01 registered.")

    except Exception as e:
        logger.error(f"Error during initial seeding: {e}")
    finally:
        db.close()

    yield
    logger.info("AgriShield backend shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Real-Time IoT-Based Smart Farmer Safety and Monitoring Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production can restrict to specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for camera uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(devices.router, prefix=settings.API_V1_STR)
app.include_router(telemetry.router, prefix=settings.API_V1_STR)
app.include_router(camera.router, prefix=settings.API_V1_STR)
app.include_router(pump.router, prefix=settings.API_V1_STR)
app.include_router(gps.router, prefix=settings.API_V1_STR)
app.include_router(emergency.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(farmers.router, prefix=settings.API_V1_STR)
app.include_router(settings_router.router, prefix=settings.API_V1_STR)

@app.get("/")
def health_check():
    return {
        "project": "AgriShield",
        "description": "Real-Time IoT-Based Smart Farmer Safety Platform",
        "status": "OPERATIONAL",
        "data_freshness_seconds": settings.DATA_FRESHNESS_INTERVAL_SECONDS,
        "device_heartbeat_timeout_seconds": settings.DEVICE_HEARTBEAT_TIMEOUT_SECONDS
    }

# WebSocket Real-Time Channel
@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(None)
):
    user_id = None
    role = None
    if token:
        payload = decode_token(token)
        if payload:
            user_id = int(payload.get("sub", 0))
            role = payload.get("role")

    if role == UserRole.ADMIN:
        await ws_manager.connect_admin(websocket)
        try:
            while True:
                data = await websocket.receive_text()
                # Admin can ping or request immediate broadcast
        except WebSocketDisconnect:
            ws_manager.disconnect_admin(websocket)
    elif user_id:
        await ws_manager.connect_user(user_id, websocket)
        try:
            while True:
                data = await websocket.receive_text()
        except WebSocketDisconnect:
            ws_manager.disconnect_user(user_id, websocket)
    else:
        # Connect as guest or device observer
        await ws_manager.connect_admin(websocket)
        try:
            while True:
                data = await websocket.receive_text()
        except WebSocketDisconnect:
            ws_manager.disconnect_admin(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
