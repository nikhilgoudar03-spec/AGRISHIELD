import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Device, DeviceStatus, PumpEvent, PumpState, EmergencyAlert,
    AlertSeverity, AlertStatus, User, UserRole, FarmerDevice, FarmerProfile
)
from app.schemas import PumpCommandIn, PumpStateAckIn, PumpStatusOut
from app.security import verify_device_key
from app.dependencies import get_current_user
from app.services.safety_engine import evaluate_device_freshness
from app.websocket_manager import ws_manager

router = APIRouter(prefix="/pump", tags=["Pump Control & Safety"])

@router.post("/command")
async def send_pump_command(
    data: PumpCommandIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    User requests pump ON or OFF.
    Checks permissions, device status, and critical emergency locks.
    Never marks pump ON until hardware actually acknowledges.
    """
    device = db.query(Device).filter(Device.id == data.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    device_status = evaluate_device_freshness(device, db)
    if device_status == DeviceStatus.OFFLINE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send command: DEVICE OFFLINE"
        )

    # Permission check for farmer
    farmer_id = None
    if current_user.role != UserRole.ADMIN:
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        assignment = db.query(FarmerDevice).filter(
            FarmerDevice.device_id == data.device_id,
            FarmerDevice.farmer_profile_id == (farmer.id if farmer else -1),
            FarmerDevice.is_active == True
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="Unauthorized for this device")
        farmer_id = farmer.id

    # Check for active emergency lock
    active_critical = db.query(EmergencyAlert).filter(
        EmergencyAlert.device_id == data.device_id,
        EmergencyAlert.status.in_([AlertStatus.NEW, AlertStatus.ACKNOWLEDGED]),
        EmergencyAlert.severity.in_([AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY])
    ).first()

    if data.command == "ON" and active_critical:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Safety interlock active! Cannot start pump while emergency alert ({active_critical.alert_type}) is unresolved."
        )

    # Record requested command event
    now = datetime.datetime.utcnow()
    # Current reported state remains whatever was previously acknowledged until hardware responds
    latest_event = db.query(PumpEvent).filter(
        PumpEvent.device_id == data.device_id
    ).order_by(PumpEvent.requested_at.desc()).first()

    current_actual_state = latest_event.state if latest_event else PumpState.OFF

    new_event = PumpEvent(
        device_id=device.id,
        farmer_id=farmer_id,
        command=data.command,
        requested_by=current_user.id,
        requested_at=now,
        state=current_actual_state,  # Remains unchanged until ACK
        source="MANUAL"
    )
    db.add(new_event)
    db.commit()

    # Broadcast command pending to WebSocket (so UI shows 'COMMAND_PENDING_ACK')
    await ws_manager.broadcast_event(
        "PUMP_COMMAND_QUEUED",
        {
            "device_id": device.id,
            "device_uid": device.device_uid,
            "command": data.command,
            "timestamp": now.isoformat()
        }
    )

    return {
        "status": "QUEUED",
        "command": data.command,
        "message": f"Command {data.command} transmitted to device {device.device_uid}. Waiting for hardware acknowledgement.",
        "current_reported_state": current_actual_state
    }

@router.post("/ack")
async def acknowledge_pump_state(
    data: PumpStateAckIn,
    x_device_uid: str = Header(..., alias="X-Device-Uid"),
    x_device_key: str = Header(..., alias="X-Device-Key"),
    db: Session = Depends(get_db)
):
    """
    Hardware ESP32 calls this endpoint after relay/MOSFET executes the command.
    """
    device = db.query(Device).filter(Device.device_uid == x_device_uid).first()
    if not device:
        raise HTTPException(status_code=401, detail="Unregistered device")
    if not verify_device_key(x_device_key, device.api_key_hash):
        raise HTTPException(status_code=401, detail="Unauthorized device credentials")

    now = datetime.datetime.utcnow()
    device.last_heartbeat = now
    device.status = DeviceStatus.ONLINE

    latest_event = db.query(PumpEvent).filter(
        PumpEvent.device_id == device.id
    ).order_by(PumpEvent.requested_at.desc()).first()

    if latest_event:
        latest_event.state = data.state
        latest_event.acknowledged_at = now
    else:
        # Initial device reported state
        latest_event = PumpEvent(
            device_id=device.id,
            command=data.state,
            requested_at=now,
            acknowledged_at=now,
            state=data.state,
            source=data.source
        )
        db.add(latest_event)

    db.commit()

    # Broadcast real-time pump ACK
    await ws_manager.broadcast_event(
        "PUMP_STATE_UPDATED",
        {
            "device_id": device.id,
            "device_uid": device.device_uid,
            "actual_state": data.state,
            "acknowledged_at": now.isoformat()
        }
    )

    return {"status": "SUCCESS", "acknowledged_state": data.state, "timestamp": now.isoformat()}

@router.get("/status", response_model=PumpStatusOut)
def get_pump_status(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    dev_status = evaluate_device_freshness(device, db)

    latest_event = db.query(PumpEvent).filter(
        PumpEvent.device_id == device_id
    ).order_by(PumpEvent.requested_at.desc()).first()

    active_emergency = db.query(EmergencyAlert).filter(
        EmergencyAlert.device_id == device_id,
        EmergencyAlert.status.in_([AlertStatus.NEW, AlertStatus.ACKNOWLEDGED]),
        EmergencyAlert.severity.in_([AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY])
    ).first()

    actual_state = latest_event.state if latest_event and latest_event.acknowledged_at else PumpState.OFF
    if dev_status == DeviceStatus.OFFLINE:
        actual_state = "OFFLINE"

    return PumpStatusOut(
        device_id=device.id,
        device_uid=device.device_uid,
        current_state=actual_state,
        last_command=latest_event.command if latest_event else None,
        last_requested_at=latest_event.requested_at if latest_event else None,
        last_acknowledged_at=latest_event.acknowledged_at if latest_event else None,
        emergency_lock=bool(active_emergency)
    )

@router.get("/pending-command")
def get_pending_command(
    x_device_uid: str = Header(..., alias="X-Device-Uid"),
    x_device_key: str = Header(..., alias="X-Device-Key"),
    db: Session = Depends(get_db)
):
    """ESP32 polling endpoint for pending commands."""
    device = db.query(Device).filter(Device.device_uid == x_device_uid).first()
    if not device or not verify_device_key(x_device_key, device.api_key_hash):
        raise HTTPException(status_code=401, detail="Unauthorized")

    unacked = db.query(PumpEvent).filter(
        PumpEvent.device_id == device.id,
        PumpEvent.acknowledged_at.is_(None)
    ).order_by(PumpEvent.requested_at.asc()).first()

    if unacked:
        return {"has_command": True, "command": unacked.command, "event_id": unacked.id}
    return {"has_command": False, "command": None}
