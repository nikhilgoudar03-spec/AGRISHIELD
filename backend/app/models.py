import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum, Index
)
from sqlalchemy.orm import relationship
from app.database import Base

class UserRole(str):
    ADMIN = "ADMIN"
    FARMER = "FARMER"

class DeviceStatus(str):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    ERROR = "ERROR"

class DeviceType(str):
    TELEMETRY_CONTROLLER = "TELEMETRY_CONTROLLER"
    CAMERA_MODULE = "CAMERA_MODULE"

class DataValidity(str):
    LIVE = "LIVE"
    STALE = "STALE"
    OFFLINE = "OFFLINE"
    ERROR = "ERROR"
    NO_DATA = "NO_DATA"

class FallStatus(str):
    POSSIBLE = "POSSIBLE"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"

class PumpState(str):
    OFF = "OFF"
    ON = "ON"
    ERROR = "ERROR"

class AlertSeverity(str):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"
    EMERGENCY = "EMERGENCY"

class AlertStatus(str):
    NEW = "NEW"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"

# 1. users
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default=UserRole.FARMER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    farmer_profile = relationship("FarmerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")

# 2. farmer_profiles
class FarmerProfile(Base):
    __tablename__ = "farmer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    mobile_number = Column(String(20), nullable=False)
    village = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    emergency_contact_name = Column(String(100), nullable=False)
    emergency_contact_mobile = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="farmer_profile")
    devices = relationship("FarmerDevice", back_populates="farmer_profile", cascade="all, delete-orphan")
    emergency_alerts = relationship("EmergencyAlert", back_populates="farmer")

# 3. devices
class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_uid = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    device_type = Column(String(30), default=DeviceType.TELEMETRY_CONTROLLER, nullable=False)
    api_key_hash = Column(String(255), nullable=False)
    firmware_version = Column(String(32), nullable=True)
    status = Column(String(20), default=DeviceStatus.OFFLINE, nullable=False)
    last_heartbeat = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    assignments = relationship("FarmerDevice", back_populates="device", cascade="all, delete-orphan")
    heartbeats = relationship("DeviceHeartbeat", back_populates="device", cascade="all, delete-orphan")
    sensor_readings = relationship("SensorReading", back_populates="device", cascade="all, delete-orphan")
    camera_images = relationship("CameraImage", back_populates="device", cascade="all, delete-orphan")
    fall_events = relationship("FallEvent", back_populates="device", cascade="all, delete-orphan")
    pump_events = relationship("PumpEvent", back_populates="device", cascade="all, delete-orphan")
    gps_locations = relationship("GPSLocation", back_populates="device", cascade="all, delete-orphan")
    emergency_alerts = relationship("EmergencyAlert", back_populates="device", cascade="all, delete-orphan")

# 4. farmer_devices
class FarmerDevice(Base):
    __tablename__ = "farmer_devices"

    id = Column(Integer, primary_key=True, index=True)
    farmer_profile_id = Column(Integer, ForeignKey("farmer_profiles.id", ondelete="CASCADE"), nullable=False)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    farmer_profile = relationship("FarmerProfile", back_populates="devices")
    device = relationship("Device", back_populates="assignments")

# 5. device_heartbeats
class DeviceHeartbeat(Base):
    __tablename__ = "device_heartbeats"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), index=True, nullable=False)
    received_at = Column(DateTime, default=datetime.datetime.utcnow, index=True, nullable=False)
    status = Column(String(20), default=DeviceStatus.ONLINE, nullable=False)
    ip_address = Column(String(45), nullable=True)
    battery_level = Column(Float, nullable=True)
    wifi_rssi = Column(Integer, nullable=True)

    device = relationship("Device", back_populates="heartbeats")

# 6. sensor_readings
class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), index=True, nullable=False)
    sensor_id = Column(String(32), index=True, nullable=False)  # MQ135, DHT11_TEMP, DHT11_HUM, MPU6050_ACC, MPU6050_GYRO
    value = Column(Float, nullable=True)
    unit = Column(String(16), nullable=False)
    raw_adc = Column(Integer, nullable=True)  # Raw ADC reading for MQ-135 or analog sensors
    device_timestamp = Column(DateTime, nullable=True)
    server_timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True, nullable=False)
    validity_status = Column(String(20), default=DataValidity.LIVE, nullable=False)
    raw_payload = Column(Text, nullable=True)

    device = relationship("Device", back_populates="sensor_readings")

Index("idx_sensor_device_time", SensorReading.device_id, SensorReading.sensor_id, SensorReading.server_timestamp)

# 7. camera_images
class CameraImage(Base):
    __tablename__ = "camera_images"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), index=True, nullable=False)
    image_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    capture_timestamp = Column(DateTime, nullable=True)
    server_timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True, nullable=False)
    spray_detected = Column(Boolean, nullable=True)
    notes = Column(String(255), nullable=True)

    device = relationship("Device", back_populates="camera_images")

# 8. fall_events
class FallEvent(Base):
    __tablename__ = "fall_events"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), index=True, nullable=False)
    farmer_id = Column(Integer, ForeignKey("farmer_profiles.id", ondelete="SET NULL"), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True, nullable=False)
    acc_x = Column(Float, nullable=False)
    acc_y = Column(Float, nullable=False)
    acc_z = Column(Float, nullable=False)
    gyro_x = Column(Float, nullable=False)
    gyro_y = Column(Float, nullable=False)
    gyro_z = Column(Float, nullable=False)
    status = Column(String(20), default=FallStatus.POSSIBLE, nullable=False)  # POSSIBLE, CONFIRMED, CANCELLED
    cancellation_reason = Column(String(255), nullable=True)
    timeout_at = Column(DateTime, nullable=False)

    device = relationship("Device", back_populates="fall_events")

# 9. pump_events
class PumpEvent(Base):
    __tablename__ = "pump_events"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), index=True, nullable=False)
    farmer_id = Column(Integer, ForeignKey("farmer_profiles.id", ondelete="SET NULL"), nullable=True)
    command = Column(String(10), nullable=False)  # ON, OFF
    requested_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    requested_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    acknowledged_at = Column(DateTime, nullable=True)
    state = Column(String(10), default=PumpState.OFF, nullable=False)  # OFF, ON, ERROR
    source = Column(String(30), default="MANUAL", nullable=False)  # MANUAL, AUTOMATIC_EMERGENCY, TIMEOUT

    device = relationship("Device", back_populates="pump_events")

# 10. gps_locations
class GPSLocation(Base):
    __tablename__ = "gps_locations"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), index=True, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    altitude = Column(Float, nullable=True)
    speed = Column(Float, nullable=True)
    fix_quality = Column(Integer, default=0, nullable=False)  # 0: no fix, 1: GPS fix, 2: DGPS fix
    satellites = Column(Integer, default=0, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True, nullable=False)

    device = relationship("Device", back_populates="gps_locations")

# 11. emergency_alerts
class EmergencyAlert(Base):
    __tablename__ = "emergency_alerts"

    id = Column(Integer, primary_key=True, index=True)
    event_uid = Column(String(64), unique=True, index=True, nullable=False)
    farmer_id = Column(Integer, ForeignKey("farmer_profiles.id", ondelete="SET NULL"), nullable=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), index=True, nullable=False)
    alert_type = Column(String(40), index=True, nullable=False)  # FALL_DETECTED, AIR_QUALITY_CRITICAL, SPRAY_EXPOSURE, PUMP_EMERGENCY_SHUTDOWN, DEVICE_OFFLINE
    severity = Column(String(20), default=AlertSeverity.CRITICAL, nullable=False)
    message = Column(Text, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    image_id = Column(Integer, ForeignKey("camera_images.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(20), default=AlertStatus.NEW, index=True, nullable=False)  # NEW, ACKNOWLEDGED, RESOLVED
    resolved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True, nullable=False)

    farmer = relationship("FarmerProfile", back_populates="emergency_alerts")
    device = relationship("Device", back_populates="emergency_alerts")
    notifications = relationship("Notification", back_populates="alert", cascade="all, delete-orphan")

# 12. notifications
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("emergency_alerts.id", ondelete="CASCADE"), index=True, nullable=False)
    recipient_contact = Column(String(100), nullable=False)
    channel = Column(String(20), default="DASHBOARD", nullable=False)  # SMS, EMAIL, DASHBOARD
    status = Column(String(20), default="PENDING", nullable=False)  # PENDING, SENT, FAILED, DELIVERED
    provider_response = Column(Text, nullable=True)
    sent_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    alert = relationship("EmergencyAlert", back_populates="notifications")

# 13. user_settings
class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    language = Column(String(10), default="en", nullable=False)  # en, kn, hi
    theme = Column(String(10), default="dark", nullable=False)  # dark, light
    fall_cancellation_timeout_sec = Column(Integer, default=20, nullable=False)
    mq135_warning_ppm = Column(Float, default=350.0, nullable=False)
    mq135_critical_ppm = Column(Float, default=600.0, nullable=False)
    email_notifications_enabled = Column(Boolean, default=True, nullable=False)
    sms_notifications_enabled = Column(Boolean, default=True, nullable=False)

    user = relationship("User", back_populates="settings")

# 14. audit_logs
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    ip_address = Column(String(45), nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True, nullable=False)

    user = relationship("User", back_populates="audit_logs")

# 15. email_verification_otps
class EmailVerificationOTP(Base):
    __tablename__ = "email_verification_otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True, nullable=False)
    otp_code = Column(String(6), nullable=False)
    purpose = Column(String(50), default="REGISTRATION", nullable=False)  # REGISTRATION, ADMIN_SETUP, LOGIN_VERIFY
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
