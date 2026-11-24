import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import (
    Device, DeviceStatus, SensorReading, DataValidity,
    GPSLocation, FallEvent, PumpEvent, PumpState, EmergencyAlert,
    AlertSeverity, AlertStatus, User, UserRole, FarmerDevice, FarmerProfile, UserSettings
)
from app.schemas import (
    TelemetryBatchIn, SensorReadingOut, LatestTelemetryOut
)
from app.security import verify_device_key
from app.dependencies import get_current_user
from app.services.safety_engine import (
    evaluate_device_freshness, calculate_reading_validity, determine_farmer_safety_status
)
from app.services.fall_detection import process_motion_telemetry
from app.websocket_manager import ws_manager

router = APIRouter(prefix="/telemetry", tags=["Telemetry & Sensors"])

@router.post("")
async def ingest_telemetry(
    batch: TelemetryBatchIn,
    x_device_uid: str = Header(..., alias="X-Device-Uid"),
    x_device_key: str = Header(..., alias="X-Device-Key"),
    db: Session = Depends(get_db)
):
    device = db.query(Device).filter(Device.device_uid == x_device_uid).first()
    if not device:
        raise HTTPException(status_code=401, detail="Device not recognized")
    if not verify_device_key(x_device_key, device.api_key_hash):
        raise HTTPException(status_code=401, detail="Unauthorized device credentials")

    now = datetime.datetime.utcnow()
    device.last_heartbeat = now
    device.status = DeviceStatus.ONLINE

    saved_readings = []
    # 1. Process each sensor reading
    for s in batch.sensors:
        reading = SensorReading(
            device_id=device.id,
            sensor_id=s.sensor_id,
            value=s.value,
            unit=s.unit,
            raw_adc=s.raw_adc,
            device_timestamp=s.device_timestamp,
            server_timestamp=now,
            validity_status=DataValidity.LIVE
        )
        db.add(reading)
        saved_readings.append(reading)

    # 2. Process GPS if included
    if batch.gps:
        lat = batch.gps.get("latitude")
        lng = batch.gps.get("longitude")
        fix_q = batch.gps.get("fix_quality", 0)
        gps_rec = GPSLocation(
            device_id=device.id,
            latitude=lat if fix_q > 0 else None,
            longitude=lng if fix_q > 0 else None,
            altitude=batch.gps.get("altitude"),
            speed=batch.gps.get("speed"),
            fix_quality=fix_q,
            satellites=batch.gps.get("satellites", 0),
            timestamp=now
        )
        db.add(gps_rec)

    # 3. Process Motion / Fall Detection
    fall_event_created = None
    if batch.acc_xyz and batch.gyro_xyz and len(batch.acc_xyz) == 3 and len(batch.gyro_xyz) == 3:
        ax, ay, az = batch.acc_xyz
        gx, gy, gz = batch.gyro_xyz
        fall_event_created = process_motion_telemetry(device, ax, ay, az, gx, gy, gz, db)

    # 4. Process Reported Pump State
    if batch.pump_state:
        # Check latest requested pump state
        latest_pump = db.query(PumpEvent).filter(
            PumpEvent.device_id == device.id
        ).order_by(PumpEvent.requested_at.desc()).first()
        
        if latest_pump:
            latest_pump.state = batch.pump_state
            latest_pump.acknowledged_at = now

    db.commit()

    # Broadcast real-time telemetry over WebSocket
    ws_payload = {
        "device_id": device.id,
        "device_uid": device.device_uid,
        "timestamp": now.isoformat(),
        "readings": [
            {
                "sensor_id": r.sensor_id,
                "value": r.value,
                "unit": r.unit,
                "raw_adc": r.raw_adc,
                "validity": DataValidity.LIVE
            }
            for r in saved_readings
        ],
        "pump_state": batch.pump_state,
        "gps": batch.gps,
        "fall_detected": bool(fall_event_created)
    }
    await ws_manager.broadcast_event("TELEMETRY_UPDATE", ws_payload)

    return {"status": "SUCCESS", "readings_stored": len(saved_readings), "timestamp": now.isoformat()}

@router.get("/latest", response_model=LatestTelemetryOut)
def get_latest_telemetry(
    device_id: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Permission check
    if current_user.role != UserRole.ADMIN:
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
        assignment = db.query(FarmerDevice).filter(
            FarmerDevice.device_id == device_id,
            FarmerDevice.farmer_profile_id == (farmer.id if farmer else -1),
            FarmerDevice.is_active == True
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="Access denied for this device")

    current_status = evaluate_device_freshness(device, db)

    def fetch_latest_sensor(sensor_id: str) -> Optional[SensorReading]:
        r = db.query(SensorReading).filter(
            SensorReading.device_id == device_id,
            SensorReading.sensor_id == sensor_id
        ).order_by(SensorReading.server_timestamp.desc()).first()
        if r:
            r.validity_status = calculate_reading_validity(r)
        return r

    mq135 = fetch_latest_sensor("MQ135")
    dht_temp = fetch_latest_sensor("DHT11_TEMP")
    dht_hum = fetch_latest_sensor("DHT11_HUM")
    mpu_acc = fetch_latest_sensor("MPU6050_ACC")
    mpu_gyro = fetch_latest_sensor("MPU6050_GYRO")

    # Movement status
    movement_status = "NO_DATA"
    if mpu_acc and mpu_acc.validity_status == DataValidity.LIVE:
        movement_status = "NORMAL"

    # Active Emergency
    active_alert = db.query(EmergencyAlert).filter(
        EmergencyAlert.device_id == device_id,
        EmergencyAlert.status.in_([AlertStatus.NEW, AlertStatus.ACKNOWLEDGED])
    ).order_by(EmergencyAlert.created_at.desc()).first()

    # User settings for thresholds
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()

    safety_status = determine_farmer_safety_status(
        device=device,
        mq135_reading=mq135,
        dht11_temp=dht_temp,
        mpu_reading=mpu_acc,
        active_alert=active_alert,
        farmer_settings=user_settings
    )

    return LatestTelemetryOut(
        device_id=device.id,
        device_uid=device.device_uid,
        device_status=current_status,
        last_seen=device.last_heartbeat,
        mq135=SensorReadingOut.from_orm(mq135) if mq135 else None,
        dht11_temp=SensorReadingOut.from_orm(dht_temp) if dht_temp else None,
        dht11_hum=SensorReadingOut.from_orm(dht_hum) if dht_hum else None,
        mpu6050_acc=SensorReadingOut.from_orm(mpu_acc) if mpu_acc else None,
        mpu6050_gyro=SensorReadingOut.from_orm(mpu_gyro) if mpu_gyro else None,
        movement_status=movement_status,
        overall_safety_status=safety_status
    )

@router.get("/history", response_model=List[SensorReadingOut])
def get_sensor_history(
    device_id: int = Query(...),
    sensor_id: str = Query(...),
    limit: int = Query(50, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    readings = db.query(SensorReading).filter(
        SensorReading.device_id == device_id,
        SensorReading.sensor_id == sensor_id
    ).order_by(SensorReading.server_timestamp.desc()).limit(limit).all()

    # Return chronological order for graph plotting
    readings.reverse()
    return [SensorReadingOut.from_orm(r) for r in readings]
