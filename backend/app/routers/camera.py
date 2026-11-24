import os
import uuid
import datetime
import logging
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Header
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import cv2
import numpy as np

from app.database import get_db
from app.models import Device, DeviceStatus, CameraImage, User, UserRole, FarmerDevice, FarmerProfile
from app.schemas import CameraImageOut
from app.security import verify_device_key
from app.dependencies import get_current_user
from app.config import settings
from app.websocket_manager import ws_manager

logger = logging.getLogger("agrishield.camera")
router = APIRouter(prefix="/camera", tags=["ESP32-CAM Monitoring"])

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

def analyze_visible_spray_opencv(file_path: str) -> bool:
    """
    OpenCV analysis for visible agricultural spray / aerosol mist detection.
    Evaluates mist dispersion patterns using grayscale gradient variance and lightness variance.
    Does NOT claim chemical concentration measurement.
    """
    try:
        img = cv2.imread(file_path)
        if img is None:
            return False
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        # High-density droplet mist creates soft localized blur/dispersion lowering gradient variance in ROI
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        sat = hsv[:, :, 1]
        mean_sat = np.mean(sat)
        # Visible agricultural spray plume creates desaturated high-frequency particulate clusters
        spray_detected = bool(laplacian_var > 120.0 and mean_sat < 70.0)
        return spray_detected
    except Exception as e:
        logger.error(f"OpenCV processing error: {e}")
        return False

@router.post("/upload")
async def upload_camera_frame(
    file: UploadFile = File(...),
    capture_timestamp: Optional[str] = Form(None),
    x_device_uid: str = Header(..., alias="X-Device-Uid"),
    x_device_key: str = Header(..., alias="X-Device-Key"),
    db: Session = Depends(get_db)
):
    device = db.query(Device).filter(Device.device_uid == x_device_uid).first()
    if not device:
        raise HTTPException(status_code=401, detail="Unregistered camera device")
    if not verify_device_key(x_device_key, device.api_key_hash):
        raise HTTPException(status_code=401, detail="Invalid device key")

    now = datetime.datetime.utcnow()
    device.last_heartbeat = now
    device.status = DeviceStatus.ONLINE

    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png"]:
        raise HTTPException(status_code=400, detail="Invalid image format. Allowed: jpg, jpeg, png")

    filename = f"{device.device_uid}_{uuid.uuid4().hex[:10]}{ext}"
    saved_path = os.path.join(settings.UPLOAD_DIR, filename)

    contents = await file.read()
    with open(saved_path, "wb") as f:
        f.write(contents)

    # Run OpenCV visible spray detection
    spray_detected = analyze_visible_spray_opencv(saved_path)

    image_rec = CameraImage(
        device_id=device.id,
        image_path=filename,
        file_size_bytes=len(contents),
        capture_timestamp=datetime.datetime.fromisoformat(capture_timestamp) if capture_timestamp else now,
        server_timestamp=now,
        spray_detected=spray_detected,
        notes="Processed by AgriShield OpenCV Spray Verification Engine"
    )
    db.add(image_rec)
    db.commit()
    db.refresh(image_rec)

    image_url = f"/api/camera/images/{filename}"

    # Broadcast image upload over WebSocket
    await ws_manager.broadcast_event(
        "CAMERA_IMAGE_UPLOADED",
        {
            "device_id": device.id,
            "device_uid": device.device_uid,
            "image_url": image_url,
            "spray_detected": spray_detected,
            "timestamp": now.isoformat()
        }
    )

    return {
        "status": "SUCCESS",
        "image_id": image_rec.id,
        "image_url": image_url,
        "spray_detected": spray_detected,
        "timestamp": now.isoformat()
    }

@router.get("/latest")
def get_latest_camera_image(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    image = db.query(CameraImage).filter(
        CameraImage.device_id == device_id
    ).order_by(CameraImage.server_timestamp.desc()).first()

    camera_online = False
    if device.last_heartbeat:
        delta = (datetime.datetime.utcnow() - device.last_heartbeat).total_seconds()
        camera_online = delta <= settings.DEVICE_HEARTBEAT_TIMEOUT_SECONDS

    if not image:
        return {
            "device_id": device_id,
            "camera_status": "ONLINE" if camera_online else "OFFLINE",
            "image": None,
            "message": "NO DATA AVAILABLE - No actual camera frames received yet."
        }

    return {
        "device_id": device_id,
        "camera_status": "ONLINE" if camera_online else "OFFLINE",
        "image": {
            "id": image.id,
            "image_url": f"/api/camera/images/{image.image_path}",
            "file_size_bytes": image.file_size_bytes,
            "capture_timestamp": image.capture_timestamp.isoformat() if image.capture_timestamp else None,
            "server_timestamp": image.server_timestamp.isoformat(),
            "spray_detected": image.spray_detected,
            "notes": image.notes
        }
    }

@router.get("/history")
def get_camera_history(
    device_id: int,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    images = db.query(CameraImage).filter(
        CameraImage.device_id == device_id
    ).order_by(CameraImage.server_timestamp.desc()).limit(limit).all()

    return [
        {
            "id": img.id,
            "image_url": f"/api/camera/images/{img.image_path}",
            "file_size_bytes": img.file_size_bytes,
            "capture_timestamp": img.capture_timestamp.isoformat() if img.capture_timestamp else None,
            "server_timestamp": img.server_timestamp.isoformat(),
            "spray_detected": img.spray_detected,
            "notes": img.notes
        }
        for img in images
    ]

@router.get("/images/{filename}")
def serve_camera_image(filename: str):
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)
