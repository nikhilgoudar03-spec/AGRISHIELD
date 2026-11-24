from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Auth Schemas ---
class AdminRegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)

class VerifyOtpIn(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=4, max_length=10)
    purpose: str = "REGISTRATION"

class ResendOtpIn(BaseModel):
    email: EmailStr
    purpose: str = "REGISTRATION"

class AuthActionResponse(BaseModel):
    success: bool
    requires_verification: bool
    message: str
    email: EmailStr
    role: Optional[str] = None
    smtp_configured: bool
    instructions: Optional[str] = None
    dev_otp: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    user_id: Optional[int] = None
    full_name: Optional[str] = None

class EmailStatusOut(BaseModel):
    smtp_configured: bool
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    from_email: Optional[str] = None
    dev_fallback_active: bool
    instructions: str

class FarmerRegisterIn(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    mobile_number: str = Field(..., min_length=10, max_length=15)
    email: EmailStr
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)
    village: str = Field(..., min_length=2, max_length=100)
    district: str = Field(..., min_length=2, max_length=100)
    emergency_contact_name: str = Field(..., min_length=2, max_length=100)
    emergency_contact_mobile: str = Field(..., min_length=10, max_length=15)

class UserLoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: str
    role: str
    user_id: int
    full_name: Optional[str] = None

class RefreshTokenIn(BaseModel):
    refresh_token: str

class FarmerProfileOut(BaseModel):
    id: int
    full_name: str
    mobile_number: str
    village: str
    district: str
    emergency_contact_name: str
    emergency_contact_mobile: str

    class Config:
        from_attributes = True

class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    is_active: bool
    is_verified: bool = True
    farmer_profile: Optional[FarmerProfileOut] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Device Schemas ---
class DeviceCreateIn(BaseModel):
    device_uid: str = Field(..., min_length=3, max_length=64)
    name: str = Field(..., min_length=2, max_length=100)
    device_type: str = "TELEMETRY_CONTROLLER"
    api_key: str = Field(..., min_length=8)
    farmer_id: Optional[int] = None

class DeviceOut(BaseModel):
    id: int
    device_uid: str
    name: str
    device_type: str
    firmware_version: Optional[str] = None
    status: str
    last_heartbeat: Optional[datetime] = None
    created_at: datetime
    assigned_farmer_id: Optional[int] = None
    assigned_farmer_name: Optional[str] = None

    class Config:
        from_attributes = True

class DeviceHeartbeatIn(BaseModel):
    firmware_version: Optional[str] = None
    battery_level: Optional[float] = None
    wifi_rssi: Optional[int] = None
    ip_address: Optional[str] = None

# --- Telemetry & Sensor Schemas ---
class SingleSensorItem(BaseModel):
    sensor_id: str  # MQ135, DHT11_TEMP, DHT11_HUM, MPU6050_ACC, MPU6050_GYRO
    value: Optional[float] = None
    unit: str
    raw_adc: Optional[int] = None
    device_timestamp: Optional[datetime] = None

class TelemetryBatchIn(BaseModel):
    device_timestamp: Optional[datetime] = None
    sensors: List[SingleSensorItem]
    pump_state: Optional[str] = None  # Report actual pump state
    gps: Optional[Dict[str, Any]] = None  # {latitude, longitude, altitude, speed, fix_quality, satellites}
    fall_detected: Optional[bool] = False
    acc_xyz: Optional[List[float]] = None  # [x, y, z]
    gyro_xyz: Optional[List[float]] = None  # [x, y, z]

class SensorReadingOut(BaseModel):
    id: int
    device_id: int
    sensor_id: str
    value: Optional[float]
    unit: str
    raw_adc: Optional[int]
    device_timestamp: Optional[datetime]
    server_timestamp: datetime
    validity_status: str

    class Config:
        from_attributes = True

class LatestTelemetryOut(BaseModel):
    device_id: int
    device_uid: str
    device_status: str  # ONLINE, OFFLINE, ERROR
    last_seen: Optional[datetime]
    mq135: Optional[SensorReadingOut] = None
    dht11_temp: Optional[SensorReadingOut] = None
    dht11_hum: Optional[SensorReadingOut] = None
    mpu6050_acc: Optional[SensorReadingOut] = None
    mpu6050_gyro: Optional[SensorReadingOut] = None
    movement_status: str = "NO_DATA"  # STATIC, ACTIVE, ABNORMAL, NO_DATA
    overall_safety_status: str = "NO_DATA"  # SAFE, WARNING, EMERGENCY, DEVICE OFFLINE, NO DATA

# --- Camera Schemas ---
class CameraImageOut(BaseModel):
    id: int
    device_id: int
    image_url: str
    file_size_bytes: int
    capture_timestamp: Optional[datetime]
    server_timestamp: datetime
    spray_detected: Optional[bool]
    notes: Optional[str]

    class Config:
        from_attributes = True

# --- Fall Detection Schemas ---
class FallEventIn(BaseModel):
    acc_x: float
    acc_y: float
    acc_z: float
    gyro_x: float
    gyro_y: float
    gyro_z: float

class FallCancelIn(BaseModel):
    reason: Optional[str] = "False positive triggered by user"

class FallEventOut(BaseModel):
    id: int
    device_id: int
    farmer_id: Optional[int]
    timestamp: datetime
    acc_x: float
    acc_y: float
    acc_z: float
    gyro_x: float
    gyro_y: float
    gyro_z: float
    status: str
    cancellation_reason: Optional[str]
    timeout_at: datetime
    seconds_remaining: Optional[int] = 0

    class Config:
        from_attributes = True

# --- Pump Schemas ---
class PumpCommandIn(BaseModel):
    device_id: int
    command: str = Field(..., pattern="^(ON|OFF)$")

class PumpStateAckIn(BaseModel):
    state: str = Field(..., pattern="^(ON|OFF|ERROR)$")
    source: Optional[str] = "DEVICE_ACK"

class PumpStatusOut(BaseModel):
    device_id: int
    device_uid: str
    current_state: str  # ON, OFF, ERROR, OFFLINE
    last_command: Optional[str] = None
    last_requested_at: Optional[datetime] = None
    last_acknowledged_at: Optional[datetime] = None
    emergency_lock: bool = False

# --- GPS Schemas ---
class GPSLocationIn(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude: Optional[float] = None
    speed: Optional[float] = None
    fix_quality: int = 0
    satellites: int = 0

class GPSLocationOut(BaseModel):
    id: int
    device_id: int
    latitude: Optional[float]
    longitude: Optional[float]
    altitude: Optional[float]
    speed: Optional[float]
    fix_quality: int
    satellites: int
    timestamp: datetime

    class Config:
        from_attributes = True

# --- Emergency Alert Schemas ---
class EmergencyAlertOut(BaseModel):
    id: int
    event_uid: str
    farmer_id: Optional[int]
    farmer_name: Optional[str] = None
    farmer_contact: Optional[str] = None
    device_id: int
    device_uid: Optional[str] = None
    alert_type: str
    severity: str
    message: str
    latitude: Optional[float]
    longitude: Optional[float]
    image_id: Optional[int]
    image_url: Optional[str] = None
    status: str
    resolved_by: Optional[int]
    resolved_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class AlertStatusUpdateIn(BaseModel):
    status: str = Field(..., pattern="^(NEW|ACKNOWLEDGED|RESOLVED)$")

# --- Settings Schemas ---
class UserSettingsIn(BaseModel):
    language: Optional[str] = "en"
    theme: Optional[str] = "dark"
    fall_cancellation_timeout_sec: Optional[int] = 20
    mq135_warning_ppm: Optional[float] = 350.0
    mq135_critical_ppm: Optional[float] = 600.0
    email_notifications_enabled: Optional[bool] = True
    sms_notifications_enabled: Optional[bool] = True

class UserSettingsOut(BaseModel):
    language: str
    theme: str
    fall_cancellation_timeout_sec: int
    mq135_warning_ppm: float
    mq135_critical_ppm: float
    email_notifications_enabled: bool
    sms_notifications_enabled: bool

    class Config:
        from_attributes = True
