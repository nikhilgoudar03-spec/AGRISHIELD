import datetime
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import (
    EmergencyAlert, AlertSeverity, AlertStatus, Device,
    FarmerProfile, FarmerDevice, User, UserRole, FallEvent, FallStatus, PumpEvent, PumpState
)
from app.schemas import (
    EmergencyAlertOut, AlertStatusUpdateIn, FallCancelIn, FallEventOut
)
from app.security import verify_device_key
from app.dependencies import get_current_user
from app.services.fall_detection import cancel_fall_event
from app.services.notification_service import dispatch_alert_notifications
from app.websocket_manager import ws_manager

router = APIRouter(prefix="/emergency", tags=["Emergency Alerts & Safety Interlocks"])

@router.post("")
async def create_hardware_emergency(
    message: str = "Hardware Emergency Button Activated by Farmer",
    alert_type: str = "EMERGENCY_BUTTON",
    x_device_uid: str = Header(..., alias="X-Device-Uid"),
    x_device_key: str = Header(..., alias="X-Device-Key"),
    db: Session = Depends(get_db)
):
    """Triggered directly by physical hardware emergency button on ESP32 DevKit."""
    device = db.query(Device).filter(Device.device_uid == x_device_uid).first()
    if not device or not verify_device_key(x_device_key, device.api_key_hash):
        raise HTTPException(status_code=401, detail="Unauthorized")

    assignment = db.query(FarmerDevice).filter(
        FarmerDevice.device_id == device.id,
        FarmerDevice.is_active == True
    ).first()
    farmer_id = assignment.farmer_profile_id if assignment else None

    # Immediate pump emergency shutdown
    shutdown_event = PumpEvent(
        device_id=device.id,
        farmer_id=farmer_id,
        command="OFF",
        state=PumpState.OFF,
        source="AUTOMATIC_EMERGENCY",
        acknowledged_at=datetime.datetime.utcnow()
    )
    db.add(shutdown_event)

    event_uid = f"ALERT-{uuid.uuid4().hex[:8].upper()}"
    alert = EmergencyAlert(
        event_uid=event_uid,
        farmer_id=farmer_id,
        device_id=device.id,
        alert_type=alert_type,
        severity=AlertSeverity.EMERGENCY,
        message=message,
        status=AlertStatus.NEW
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    # Dispatch notification to family contacts
    dispatch_alert_notifications(alert, db)

    # Broadcast over WebSocket
    await ws_manager.broadcast_event(
        "EMERGENCY_TRIGGERED",
        {
            "alert_id": alert.id,
            "event_uid": alert.event_uid,
            "device_uid": device.device_uid,
            "message": alert.message,
            "severity": alert.severity,
            "timestamp": alert.created_at.isoformat()
        }
    )

    return {"status": "ACK", "event_uid": event_uid, "pump_shutdown": True}

@router.get("", response_model=List[EmergencyAlertOut])
def list_emergency_alerts(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(EmergencyAlert)
    if current_user.role != UserRole.ADMIN:
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        if not farmer:
            return []
        query = query.filter(EmergencyAlert.farmer_id == farmer.id)

    if status_filter:
        query = query.filter(EmergencyAlert.status == status_filter)

    alerts = query.order_by(EmergencyAlert.created_at.desc()).limit(100).all()

    results = []
    for a in alerts:
        farmer_name = a.farmer.full_name if a.farmer else "Unassigned"
        farmer_contact = a.farmer.mobile_number if a.farmer else "N/A"
        results.append(EmergencyAlertOut(
            id=a.id,
            event_uid=a.event_uid,
            farmer_id=a.farmer_id,
            farmer_name=farmer_name,
            farmer_contact=farmer_contact,
            device_id=a.device_id,
            device_uid=a.device.device_uid if a.device else None,
            alert_type=a.alert_type,
            severity=a.severity,
            message=a.message,
            latitude=a.latitude,
            longitude=a.longitude,
            image_id=a.image_id,
            image_url=f"/api/camera/images/{a.image_id}" if a.image_id else None,
            status=a.status,
            resolved_by=a.resolved_by,
            resolved_at=a.resolved_at,
            created_at=a.created_at
        ))
    return results

@router.patch("/{id}/status")
async def update_alert_status(
    id: int,
    data: AlertStatusUpdateIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    alert = db.query(EmergencyAlert).filter(EmergencyAlert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = data.status
    if data.status == AlertStatus.RESOLVED:
        alert.resolved_by = current_user.id
        alert.resolved_at = datetime.datetime.utcnow()
    db.commit()

    await ws_manager.broadcast_event(
        "ALERT_STATUS_CHANGED",
        {
            "alert_id": alert.id,
            "status": alert.status,
            "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None
        }
    )

    return {"status": "SUCCESS", "new_status": alert.status}

@router.get("/fall/active", response_model=Optional[FallEventOut])
def get_active_fall_event(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns active pending fall event in cancellation window, if one exists."""
    now = datetime.datetime.utcnow()
    fall = db.query(FallEvent).filter(
        FallEvent.device_id == device_id,
        FallEvent.status == FallStatus.POSSIBLE,
        FallEvent.timeout_at > now
    ).order_by(FallEvent.timestamp.desc()).first()

    if not fall:
        return None

    remaining = max(0, int((fall.timeout_at - now).total_seconds()))
    out = FallEventOut.from_orm(fall)
    out.seconds_remaining = remaining
    return out

@router.post("/fall/{id}/cancel")
async def cancel_pending_fall(
    id: int,
    data: FallCancelIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allows farmer to cancel false positive fall alert within 20s window."""
    fall = cancel_fall_event(id, data.reason, db)
    if not fall:
        raise HTTPException(status_code=404, detail="Fall event not found or already processed")

    await ws_manager.broadcast_event(
        "FALL_CANCELLED",
        {"fall_id": id, "reason": data.reason}
    )

    return {"status": "CANCELLED", "message": "Fall alarm cancelled successfully. Safety system disarmed."}
