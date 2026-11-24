import datetime
import uuid
import logging
from sqlalchemy.orm import Session
from app.config import settings
from app.models import (
    Device, DeviceStatus, SensorReading, DataValidity,
    EmergencyAlert, AlertSeverity, AlertStatus, PumpEvent, PumpState,
    FarmerDevice, UserSettings
)
from app.websocket_manager import ws_manager

logger = logging.getLogger("agrishield.safety")

def evaluate_device_freshness(device: Device, db: Session) -> str:
    """Evaluates if the device is ONLINE or OFFLINE based on actual heartbeat timestamp."""
    if not device.last_heartbeat:
        if device.status != DeviceStatus.OFFLINE:
            device.status = DeviceStatus.OFFLINE
            db.commit()
        return DeviceStatus.OFFLINE

    now = datetime.datetime.utcnow()
    delta = (now - device.last_heartbeat).total_seconds()
    if delta > settings.DEVICE_HEARTBEAT_TIMEOUT_SECONDS:
        if device.status != DeviceStatus.OFFLINE:
            device.status = DeviceStatus.OFFLINE
            db.commit()
            # If device transitioned to OFFLINE while pump was ON, issue automatic shutdown
            handle_device_offline_safety(device, db)
        return DeviceStatus.OFFLINE
    
    return device.status

def handle_device_offline_safety(device: Device, db: Session):
    """Safety Protocol: If a device goes offline during active operation, ensure pump state is flagged OFF."""
    # Check if latest pump state was ON
    last_pump = db.query(PumpEvent).filter(
        PumpEvent.device_id == device.id
    ).order_by(PumpEvent.requested_at.desc()).first()

    if last_pump and last_pump.state == PumpState.ON:
        shutdown_event = PumpEvent(
            device_id=device.id,
            farmer_id=last_pump.farmer_id,
            command="OFF",
            requested_by=None,
            state=PumpState.OFF,
            source="AUTOMATIC_EMERGENCY",
            acknowledged_at=datetime.datetime.utcnow()
        )
        db.add(shutdown_event)

        # Create emergency alert for communication loss during active pump
        event_uid = f"OFFLINE-{uuid.uuid4().hex[:8].upper()}"
        alert = EmergencyAlert(
            event_uid=event_uid,
            farmer_id=last_pump.farmer_id,
            device_id=device.id,
            alert_type="DEVICE_OFFLINE",
            severity=AlertSeverity.WARNING,
            message=f"Device {device.device_uid} connection lost during active spraying. Automatic safety shutdown engaged.",
            status=AlertStatus.NEW
        )
        db.add(alert)
        db.commit()

def calculate_reading_validity(reading: SensorReading) -> str:
    """Returns LIVE if reading was received within freshness interval, else STALE."""
    if not reading.server_timestamp:
        return DataValidity.NO_DATA
    delta = (datetime.datetime.utcnow() - reading.server_timestamp).total_seconds()
    if delta > settings.DATA_FRESHNESS_INTERVAL_SECONDS:
        return DataValidity.STALE
    return DataValidity.LIVE

def determine_farmer_safety_status(
    device: Device,
    mq135_reading: SensorReading,
    dht11_temp: SensorReading,
    mpu_reading: SensorReading,
    active_alert: EmergencyAlert,
    farmer_settings: UserSettings
) -> str:
    """
    CRITICAL REQUIREMENT:
    - Display SAFE only when sufficient valid sensor and device information supports that status.
    - WARNING when a configured warning condition is detected.
    - EMERGENCY when a verified emergency event is registered.
    - DEVICE OFFLINE when communication is lost.
    - NO DATA when readings are unavailable or stale.
    - Never automatically display SAFE merely because no alert exists.
    """
    if not device or device.status == DeviceStatus.OFFLINE:
        return "DEVICE OFFLINE"

    if active_alert and active_alert.status in [AlertStatus.NEW, AlertStatus.ACKNOWLEDGED]:
        if active_alert.severity in [AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY]:
            return "EMERGENCY"
        elif active_alert.severity == AlertSeverity.WARNING:
            return "WARNING"

    # Verify sensor data presence
    if not mq135_reading or not dht11_temp:
        return "NO DATA"

    # Check validity freshness
    if (calculate_reading_validity(mq135_reading) != DataValidity.LIVE or
        calculate_reading_validity(dht11_temp) != DataValidity.LIVE):
        return "STALE DATA"

    # Check sensor values against configured safety thresholds
    warning_ppm = farmer_settings.mq135_warning_ppm if farmer_settings else 350.0
    critical_ppm = farmer_settings.mq135_critical_ppm if farmer_settings else 600.0

    if mq135_reading.value is not None:
        if mq135_reading.value >= critical_ppm:
            return "EMERGENCY"
        elif mq135_reading.value >= warning_ppm:
            return "WARNING"

    # Temperature threshold check (> 45°C extreme heat stress warning)
    if dht11_temp.value is not None:
        if dht11_temp.value > 45.0 or dht11_temp.value < 0.0:
            return "WARNING"

    # If all verified sensors are live and values are within safe boundaries:
    return "SAFE"
