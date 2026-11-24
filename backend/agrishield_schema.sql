-- ===================================================
-- AGRISHIELD: Real-Time IoT-Based Smart Farmer Safety Platform
-- Complete MySQL Database Schema (14 Tables)
-- ===================================================

CREATE DATABASE IF NOT EXISTS `agrishield` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `agrishield`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. users
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `hashed_password` VARCHAR(255) NOT NULL,
  `role` ENUM('ADMIN', 'FARMER') NOT NULL DEFAULT 'FARMER',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. farmer_profiles
DROP TABLE IF EXISTS `farmer_profiles`;
CREATE TABLE `farmer_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `full_name` VARCHAR(100) NOT NULL,
  `mobile_number` VARCHAR(20) NOT NULL,
  `village` VARCHAR(100) NOT NULL,
  `district` VARCHAR(100) NOT NULL,
  `emergency_contact_name` VARCHAR(100) NOT NULL,
  `emergency_contact_mobile` VARCHAR(20) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. devices
DROP TABLE IF EXISTS `devices`;
CREATE TABLE `devices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `device_uid` VARCHAR(64) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `device_type` ENUM('TELEMETRY_CONTROLLER', 'CAMERA_MODULE') NOT NULL DEFAULT 'TELEMETRY_CONTROLLER',
  `api_key_hash` VARCHAR(255) NOT NULL,
  `firmware_version` VARCHAR(32) NULL,
  `status` ENUM('ONLINE', 'OFFLINE', 'ERROR') NOT NULL DEFAULT 'OFFLINE',
  `last_heartbeat` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_devices_uid` (`device_uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. farmer_devices
DROP TABLE IF EXISTS `farmer_devices`;
CREATE TABLE `farmer_devices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `farmer_profile_id` INT NOT NULL,
  `device_id` INT NOT NULL,
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (`farmer_profile_id`) REFERENCES `farmer_profiles` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. device_heartbeats
DROP TABLE IF EXISTS `device_heartbeats`;
CREATE TABLE `device_heartbeats` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `device_id` INT NOT NULL,
  `received_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ONLINE',
  `ip_address` VARCHAR(45) NULL,
  `battery_level` FLOAT NULL,
  `wifi_rssi` INT NULL,
  INDEX `idx_heartbeat_device_time` (`device_id`, `received_at`),
  FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. sensor_readings
DROP TABLE IF EXISTS `sensor_readings`;
CREATE TABLE `sensor_readings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `device_id` INT NOT NULL,
  `sensor_id` VARCHAR(32) NOT NULL,
  `value` FLOAT NULL,
  `unit` VARCHAR(16) NOT NULL,
  `raw_adc` INT NULL,
  `device_timestamp` DATETIME NULL,
  `server_timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `validity_status` ENUM('LIVE', 'STALE', 'ERROR', 'NO_DATA') NOT NULL DEFAULT 'LIVE',
  `raw_payload` TEXT NULL,
  INDEX `idx_sensor_readings_query` (`device_id`, `sensor_id`, `server_timestamp`),
  FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. camera_images
DROP TABLE IF EXISTS `camera_images`;
CREATE TABLE `camera_images` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `device_id` INT NOT NULL,
  `image_path` VARCHAR(500) NOT NULL,
  `file_size_bytes` INT NOT NULL,
  `capture_timestamp` DATETIME NULL,
  `server_timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `spray_detected` BOOLEAN NULL,
  `notes` VARCHAR(255) NULL,
  INDEX `idx_camera_images_device` (`device_id`, `server_timestamp`),
  FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. fall_events
DROP TABLE IF EXISTS `fall_events`;
CREATE TABLE `fall_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `device_id` INT NOT NULL,
  `farmer_id` INT NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `acc_x` FLOAT NOT NULL,
  `acc_y` FLOAT NOT NULL,
  `acc_z` FLOAT NOT NULL,
  `gyro_x` FLOAT NOT NULL,
  `gyro_y` FLOAT NOT NULL,
  `gyro_z` FLOAT NOT NULL,
  `status` ENUM('POSSIBLE', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'POSSIBLE',
  `cancellation_reason` VARCHAR(255) NULL,
  `timeout_at` DATETIME NOT NULL,
  INDEX `idx_fall_events_device` (`device_id`, `timestamp`),
  FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`farmer_id`) REFERENCES `farmer_profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. pump_events
DROP TABLE IF EXISTS `pump_events`;
CREATE TABLE `pump_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `device_id` INT NOT NULL,
  `farmer_id` INT NULL,
  `command` ENUM('ON', 'OFF') NOT NULL,
  `requested_by` INT NULL,
  `requested_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `acknowledged_at` DATETIME NULL,
  `state` ENUM('OFF', 'ON', 'ERROR') NOT NULL DEFAULT 'OFF',
  `source` ENUM('MANUAL', 'AUTOMATIC_EMERGENCY', 'TIMEOUT') NOT NULL DEFAULT 'MANUAL',
  INDEX `idx_pump_device_time` (`device_id`, `requested_at`),
  FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`farmer_id`) REFERENCES `farmer_profiles` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. gps_locations
DROP TABLE IF EXISTS `gps_locations`;
CREATE TABLE `gps_locations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `device_id` INT NOT NULL,
  `latitude` DOUBLE NULL,
  `longitude` DOUBLE NULL,
  `altitude` FLOAT NULL,
  `speed` FLOAT NULL,
  `fix_quality` INT NOT NULL DEFAULT 0,
  `satellites` INT NOT NULL DEFAULT 0,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_gps_device_time` (`device_id`, `timestamp`),
  FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. emergency_alerts
DROP TABLE IF EXISTS `emergency_alerts`;
CREATE TABLE `emergency_alerts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_uid` VARCHAR(64) NOT NULL UNIQUE,
  `farmer_id` INT NULL,
  `device_id` INT NOT NULL,
  `alert_type` ENUM('FALL_DETECTED', 'AIR_QUALITY_CRITICAL', 'SPRAY_EXPOSURE', 'PUMP_EMERGENCY_SHUTDOWN', 'DEVICE_OFFLINE') NOT NULL,
  `severity` ENUM('INFO', 'WARNING', 'CRITICAL', 'EMERGENCY') NOT NULL DEFAULT 'CRITICAL',
  `message` TEXT NOT NULL,
  `latitude` DOUBLE NULL,
  `longitude` DOUBLE NULL,
  `image_id` INT NULL,
  `status` ENUM('NEW', 'ACKNOWLEDGED', 'RESOLVED') NOT NULL DEFAULT 'NEW',
  `resolved_by` INT NULL,
  `resolved_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_alerts_status_time` (`status`, `created_at`),
  FOREIGN KEY (`farmer_id`) REFERENCES `farmer_profiles` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`image_id`) REFERENCES `camera_images` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. notifications
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `alert_id` INT NOT NULL,
  `recipient_contact` VARCHAR(100) NOT NULL,
  `channel` ENUM('SMS', 'EMAIL', 'DASHBOARD') NOT NULL DEFAULT 'DASHBOARD',
  `status` ENUM('PENDING', 'SENT', 'FAILED', 'DELIVERED') NOT NULL DEFAULT 'PENDING',
  `provider_response` TEXT NULL,
  `sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`alert_id`) REFERENCES `emergency_alerts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. user_settings
DROP TABLE IF EXISTS `user_settings`;
CREATE TABLE `user_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `language` VARCHAR(10) NOT NULL DEFAULT 'en',
  `theme` VARCHAR(10) NOT NULL DEFAULT 'dark',
  `fall_cancellation_timeout_sec` INT NOT NULL DEFAULT 20,
  `mq135_warning_ppm` FLOAT NOT NULL DEFAULT 350.0,
  `mq135_critical_ppm` FLOAT NOT NULL DEFAULT 600.0,
  `email_notifications_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `sms_notifications_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. audit_logs
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `action` VARCHAR(100) NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `details` TEXT NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_logs_user_time` (`user_id`, `timestamp`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
