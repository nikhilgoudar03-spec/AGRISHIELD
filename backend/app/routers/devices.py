import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import (
    Device, DeviceStatus, DeviceHeartbeat, FarmerDevice, FarmerProfile, User, UserRole
)
from app.schemas import DeviceCreateIn, DeviceOut, DeviceHeartbeatIn
from app.security import hash_device_key, verify_device_key
from app.dependencies import get_current_user, get_current_admin
from app.services.safety_engine import evaluate_device_freshness
from app.websocket_manager import ws_manager

router = APIRouter(prefix="/devices", tags=["Devices"])

@router.post("", response_model=DeviceOut)
def register_device(
    data: DeviceCreateIn,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(Device).filter(Device.device_uid == data.device_uid).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Device with UID '{data.device_uid}' already exists.",
        )
    
    device = Device(
        device_uid=data.device_uid,
        name=data.name,
        device_type=data.device_type,
        api_key_hash=hash_device_key(data.api_key),
        status=DeviceStatus.OFFLINE
    )
    db.add(device)
    db.flush()

    if data.farmer_id:
        farmer = db.query(FarmerProfile).filter(FarmerProfile.id == data.farmer_id).first()
        if not farmer:
            raise HTTPException(status_code=404, detail="Assigned farmer profile not found")
        assignment = FarmerDevice(
            farmer_profile_id=farmer.id,
            device_id=device.id,
            is_active=True
        )
        db.add(assignment)

    db.commit()
    db.refresh(device)
    return get_device_detail(device.id, admin, db)

@router.get("", response_model=List[DeviceOut])
def list_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == UserRole.ADMIN:
        devices = db.query(Device).all()
    else:
        # Farmer: only view their own assigned device(s)
        farmer_profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        if not farmer_profile:
            return []
        devices = (
            db.query(Device)
            .join(FarmerDevice, FarmerDevice.device_id == Device.id)
            .filter(FarmerDevice.farmer_profile_id == farmer_profile.id, FarmerDevice.is_active == True)
            .all()
        )

    results = []
    for d in devices:
        # Evaluate freshness
        current_status = evaluate_device_freshness(d, db)
        
        # Look up assigned farmer
        assignment = db.query(FarmerDevice).filter(
            FarmerDevice.device_id == d.id,
            FarmerDevice.is_active == True
        ).first()
        
        farmer_id = assignment.farmer_profile_id if assignment else None
        farmer_name = assignment.farmer_profile.full_name if assignment and assignment.farmer_profile else None

        results.append(DeviceOut(
            id=d.id,
            device_uid=d.device_uid,
            name=d.name,
            device_type=d.device_type,
            firmware_version=d.firmware_version,
            status=current_status,
            last_heartbeat=d.last_heartbeat,
            created_at=d.created_at,
            assigned_farmer_id=farmer_id,
            assigned_farmer_name=farmer_name
        ))
    return results

@router.get("/{id}", response_model=DeviceOut)
def get_device_detail(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    device = db.query(Device).filter(Device.id == id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Permission check for farmer
    if current_user.role != UserRole.ADMIN:
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        assignment = db.query(FarmerDevice).filter(
            FarmerDevice.device_id == id,
            FarmerDevice.farmer_profile_id == (farmer.id if farmer else -1),
            FarmerDevice.is_active == True
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="You do not have permission to view this device")

    current_status = evaluate_device_freshness(device, db)
    assignment = db.query(FarmerDevice).filter(
        FarmerDevice.device_id == device.id,
        FarmerDevice.is_active == True
    ).first()

    return DeviceOut(
        id=device.id,
        device_uid=device.device_uid,
        name=device.name,
        device_type=device.device_type,
        firmware_version=device.firmware_version,
        status=current_status,
        last_heartbeat=device.last_heartbeat,
        created_at=device.created_at,
        assigned_farmer_id=assignment.farmer_profile_id if assignment else None,
        assigned_farmer_name=assignment.farmer_profile.full_name if assignment and assignment.farmer_profile else None
    )

@router.post("/{id}/heartbeat")
async def device_heartbeat(
    id: int,
    data: DeviceHeartbeatIn,
    x_device_key: str = Header(..., alias="X-Device-Key"),
    db: Session = Depends(get_db)
):
    device = db.query(Device).filter(Device.id == id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    if not verify_device_key(x_device_key, device.api_key_hash):
        raise HTTPException(status_code=401, detail="Unauthorized device credentials")

    now = datetime.datetime.utcnow()
    device.last_heartbeat = now
    device.status = DeviceStatus.ONLINE
    if data.firmware_version:
        device.firmware_version = data.firmware_version
    
    hb = DeviceHeartbeat(
        device_id=device.id,
        received_at=now,
        status=DeviceStatus.ONLINE,
        ip_address=data.ip_address,
        battery_level=data.battery_level,
        wifi_rssi=data.wifi_rssi
    )
    db.add(hb)
    db.commit()

    # Broadcast heartbeat update over WebSocket
    await ws_manager.broadcast_event(
        "DEVICE_HEARTBEAT",
        {
            "device_id": device.id,
            "device_uid": device.device_uid,
            "status": DeviceStatus.ONLINE,
            "last_heartbeat": now.isoformat(),
            "battery_level": data.battery_level,
            "wifi_rssi": data.wifi_rssi
        }
    )

    return {"status": "ACK", "server_timestamp": now.isoformat()}

@router.get("/{id}/status")
def get_device_status(
    id: int,
    db: Session = Depends(get_db)
):
    device = db.query(Device).filter(Device.id == id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    status_evaluated = evaluate_device_freshness(device, db)
    return {
        "device_id": device.id,
        "device_uid": device.device_uid,
        "status": status_evaluated,
        "last_heartbeat": device.last_heartbeat.isoformat() if device.last_heartbeat else None
    }
