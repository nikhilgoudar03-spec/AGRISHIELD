import math
import datetime
import uuid
import logging
from sqlalchemy.orm import Session
from app.config import settings
from app.models import (
    Device, FallEvent, FallStatus, EmergencyAlert, AlertSeverity, AlertStatus,
    PumpEvent, PumpState, FarmerProfile, FarmerDevice
)
from app.websocket_manager import ws_manager

logger = logging.getLogger("agrishield.fall")

def process_motion_telemetry(
    device: Device,
    acc_x: float,
    acc_y: float,
    acc_z: float,
    gyro_x: float,
    gyro_y: float,
    gyro_z: float,
    db: Session
) -> FallEvent:
    """
    Evaluates real 3-axis motion metrics from MPU6050.
    Calculates total acceleration magnitude:
      a_total = sqrt(ax^2 + ay^2 + az^2)
    And angular velocity magnitude:
      w_total = sqrt(gx^2 + gy^2 + gz^2)
      
    A fall event exhibits:
    1. Impact spike: a_total > 2.5g (or equivalent threshold) OR free-fall drop followed by rapid impact.
    2. High angular rate of rotation: w_total > 200 deg/s.
    """
    a_mag = math.sqrt(acc_x**2 + acc_y**2 + acc_z**2)
    g_mag = math.sqrt(gyro_x**2 + gyro_y**2 + gyro_z**2)

    # Detect abnormal movement indicative of a fall
    is_abnormal = (a_mag > 2.6 or a_mag < 0.35) and (g_mag > 180.0)

    # Check if there is already an active pending fall event for this device
    active_fall = db.query(FallEvent).filter(
        FallEvent.device_id == device.id,
        FallEvent.status == FallStatus.POSSIBLE
    ).order_by(FallEvent.timestamp.desc()).first()

    now = datetime.datetime.utcnow()

    # Check if existing pending fall has timed out -> escalate to CONFIRMED
    if active_fall:
        if now >= active_fall.timeout_at:
            confirm_fall_emergency(active_fall, db)
        return active_fall

    if is_abnormal:
        # Find farmer assigned to this device
        assignment = db.query(FarmerDevice).filter(
            FarmerDevice.device_id == device.id,
            FarmerDevice.is_active == True
        ).first()
        farmer_id = assignment.farmer_profile_id if assignment else None

        timeout_at = now + datetime.timedelta(seconds=settings.FALL_CANCELLATION_WINDOW_SECONDS)
        fall_event = FallEvent(
            device_id=device.id,
            farmer_id=farmer_id,
            timestamp=now,
            acc_x=acc_x,
            acc_y=acc_y,
            acc_z=acc_z,
            gyro_x=gyro_x,
            gyro_y=gyro_y,
            gyro_z=gyro_z,
            status=FallStatus.POSSIBLE,
            timeout_at=timeout_at
        )
        db.add(fall_event)
        db.commit()
        db.refresh(fall_event)

        logger.warning(f"Possible fall detected on device {device.device_uid}! Initiating {settings.FALL_CANCELLATION_WINDOW_SECONDS}s cancellation window.")
        return fall_event

    return None

def confirm_fall_emergency(fall_event: FallEvent, db: Session):
    """Escalates possible fall to CONFIRMED emergency after timeout or confirmation."""
    fall_event.status = FallStatus.CONFIRMED
    db.commit()

    # 1. Immediately send pump OFF command
    shutdown_event = PumpEvent(
        device_id=fall_event.device_id,
        farmer_id=fall_event.farmer_id,
        command="OFF",
        requested_by=None,
        state=PumpState.OFF,
        source="AUTOMATIC_EMERGENCY",
        acknowledged_at=datetime.datetime.utcnow()
    )
    db.add(shutdown_event)

    # 2. Create emergency alert record
    event_uid = f"FALL-{uuid.uuid4().hex[:8].upper()}"
    alert = EmergencyAlert(
        event_uid=event_uid,
        farmer_id=fall_event.farmer_id,
        device_id=fall_event.device_id,
        alert_type="FALL_DETECTED",
        severity=AlertSeverity.EMERGENCY,
        message="Farmer fall detected and confirmed by MPU-6050 telemetry. Spray pump shut down automatically.",
        status=AlertStatus.NEW
    )
    db.add(alert)
    db.commit()
    logger.critical(f"EMERGENCY CONFIRMED for device {fall_event.device_id}. Pump shut down. Alert {event_uid} issued.")

def cancel_fall_event(fall_event_id: int, reason: str, db: Session) -> FallEvent:
    fall_event = db.query(FallEvent).filter(FallEvent.id == fall_event_id).first()
    if not fall_event:
        return None
    if fall_event.status == FallStatus.POSSIBLE:
        fall_event.status = FallStatus.CANCELLED
        fall_event.cancellation_reason = reason
        db.commit()
        logger.info(f"Fall event {fall_event_id} cancelled by farmer: {reason}")
    return fall_event
