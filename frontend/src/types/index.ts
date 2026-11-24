export type UserRole = 'ADMIN' | 'FARMER';

export interface FarmerProfile {
  id: number;
  full_name: string;
  mobile_number: string;
  village: string;
  district: string;
  emergency_contact_name: string;
  emergency_contact_mobile: string;
}

export interface User {
  id: number;
  email: string;
  role: UserRole;
  is_active: boolean;
  farmer_profile?: FarmerProfile;
  created_at: string;
}

export interface Device {
  id: number;
  device_uid: string;
  name: string;
  device_type: 'TELEMETRY_CONTROLLER' | 'CAMERA_MODULE';
  firmware_version?: string;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR';
  last_heartbeat?: string;
  created_at: string;
  assigned_farmer_id?: number;
  assigned_farmer_name?: string;
}

export interface SensorReading {
  id: number;
  device_id: number;
  sensor_id: string;
  value: number | null;
  unit: string;
  raw_adc?: number | null;
  device_timestamp?: string;
  server_timestamp: string;
  validity_status: 'LIVE' | 'STALE' | 'OFFLINE' | 'ERROR' | 'NO_DATA';
}

export interface LatestTelemetry {
  device_id: number;
  device_uid: string;
  device_status: 'ONLINE' | 'OFFLINE' | 'ERROR';
  last_seen?: string;
  mq135?: SensorReading;
  dht11_temp?: SensorReading;
  dht11_hum?: SensorReading;
  mpu6050_acc?: SensorReading;
  mpu6050_gyro?: SensorReading;
  movement_status: string;
  overall_safety_status: 'SAFE' | 'WARNING' | 'EMERGENCY' | 'DEVICE OFFLINE' | 'NO DATA' | 'STALE DATA';
}

export interface CameraImage {
  id: number;
  image_url: string;
  file_size_bytes: number;
  capture_timestamp?: string;
  server_timestamp: string;
  spray_detected?: boolean;
  notes?: string;
}

export interface FallEvent {
  id: number;
  device_id: number;
  farmer_id?: number;
  timestamp: string;
  acc_x: number;
  acc_y: number;
  acc_z: number;
  gyro_x: number;
  gyro_y: number;
  gyro_z: number;
  status: 'POSSIBLE' | 'CONFIRMED' | 'CANCELLED';
  cancellation_reason?: string;
  timeout_at: string;
  seconds_remaining?: number;
}

export interface PumpStatus {
  device_id: number;
  device_uid: string;
  current_state: 'ON' | 'OFF' | 'ERROR' | 'OFFLINE';
  last_command?: string;
  last_requested_at?: string;
  last_acknowledged_at?: string;
  emergency_lock: boolean;
}

export interface GPSData {
  device_id: number;
  status: 'VALID_FIX' | 'NO_FIX' | 'NO_DATA';
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
  speed?: number | null;
  fix_quality: number;
  satellites: number;
  timestamp?: string;
  message: string;
}

export interface EmergencyAlert {
  id: number;
  event_uid: string;
  farmer_id?: number;
  farmer_name?: string;
  farmer_contact?: string;
  device_id: number;
  device_uid?: string;
  alert_type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
  message: string;
  latitude?: number | null;
  longitude?: number | null;
  image_id?: number | null;
  image_url?: string | null;
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
  resolved_by?: number | null;
  resolved_at?: string | null;
  created_at: string;
}

export interface UserSettings {
  language: string;
  theme: string;
  fall_cancellation_timeout_sec: number;
  mq135_warning_ppm: number;
  mq135_critical_ppm: number;
  email_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
}
