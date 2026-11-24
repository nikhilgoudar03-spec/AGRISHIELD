import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Device, GPSLocation, User, UserRole, FarmerDevice, FarmerProfile
from app.schemas import GPSLocationIn, GPSLocationOut
from app.security import verify_device_key
from app.dependencies import get_current_user
from app.websocket_manager import ws_manager

router = APIRouter(prefix="/gps", tags=["NEO-6M GPS Tracking"])

@router.post("")
async def post_gps_location(
    data: GPSLocationIn,
    x_device_uid: str = Header(..., alias="X-Device-Uid"),
    x_device_key: str = Header(..., alias="X-Device-Key"),
    db: Session = Depends(get_db)
):
    device = db.query(Device).filter(Device.device_uid == x_device_uid).first()
    if not device or not verify_device_key(x_device_key, device.api_key_hash):
        raise HTTPException(status_code=401, detail="Unauthorized")

    now = datetime.datetime.utcnow()
    # If fix_quality is 0 (no fix), store null coordinates to uphold data integrity
    has_valid_fix = (data.fix_quality > 0) and (data.latitude is not None) and (data.longitude is not None)

    gps_entry = GPSLocation(
        device_id=device.id,
        latitude=data.latitude if has_valid_fix else None,
        longitude=data.longitude if has_valid_fix else None,
        altitude=data.altitude,
        speed=data.speed,
        fix_quality=data.fix_quality,
        satellites=data.satellites,
        timestamp=now
    )
    db.add(gps_entry)
    db.commit()

    await ws_manager.broadcast_event(
        "GPS_LOCATION_UPDATED",
        {
            "device_id": device.id,
            "device_uid": device.device_uid,
            "has_fix": has_valid_fix,
            "latitude": gps_entry.latitude,
            "longitude": gps_entry.longitude,
            "fix_quality": gps_entry.fix_quality,
            "satellites": gps_entry.satellites,
            "timestamp": now.isoformat()
        }
    )

    return {"status": "SUCCESS", "has_fix": has_valid_fix, "timestamp": now.isoformat()}

@router.get("/latest")
def get_latest_gps(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    gps = db.query(GPSLocation).filter(
        GPSLocation.device_id == device_id
    ).order_by(GPSLocation.timestamp.desc()).first()

    if not gps:
        return {
            "device_id": device_id,
            "status": "NO_DATA",
            "message": "NO DATA AVAILABLE - No GPS signals received from NEO-6M module."
        }

    has_fix = (gps.fix_quality > 0) and (gps.latitude is not None) and (gps.longitude is not None)
    return {
        "device_id": device_id,
        "status": "VALID_FIX" if has_fix else "NO_FIX",
        "latitude": gps.latitude if has_fix else None,
        "longitude": gps.longitude if has_fix else None,
        "altitude": gps.altitude,
        "speed": gps.speed,
        "fix_quality": gps.fix_quality,
        "satellites": gps.satellites,
        "timestamp": gps.timestamp.isoformat(),
        "message": "Valid GPS Fix Acquired" if has_fix else "SEARCHING FOR SATELLITES (No valid fix)"
    }

@router.get("/history", response_model=List[GPSLocationOut])
def get_gps_history(
    device_id: int,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    history = db.query(GPSLocation).filter(
        GPSLocation.device_id == device_id,
        GPSLocation.fix_quality > 0
    ).order_by(GPSLocation.timestamp.desc()).limit(limit).all()

    return [GPSLocationOut.from_orm(g) for g in history]
