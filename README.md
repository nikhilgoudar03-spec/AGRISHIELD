# AgriShield: Real-Time IoT-Based Smart Farmer Safety and Monitoring Platform

**AgriShield** is a professional, production-grade agricultural safety system designed to protect farmers during hazardous chemical pesticide spraying. It integrates real IoT hardware (ESP32 DevKit V1 and ESP32-CAM), environmental sensor telemetry, validated fall detection, satellite GPS tracking, hardware-interlocked pump safety control, and real-time emergency dispatch notifications.

---

## 1. Core Safety & Data Integrity Guarantees

1. **Only Actual Hardware Data:** The platform displays strictly verified data received from authenticated microcontrollers.
2. **Zero Fabricated Readings:** Never displays random, simulated, or hardcoded sensor numbers on live dashboards.
3. **Strict Device Offline Detection:** Devices without a valid heartbeat within 30 seconds are prominently labeled `DEVICE OFFLINE`.
4. **No-Data Distinction:** Sensors without active readings display `NO DATA AVAILABLE` rather than synthetic graphs.
5. **Hardware Acknowledged Pump Control:** The pump state in the dashboard only updates **after** the microcontroller acknowledges the relay actuation.
6. **Automatic Safety Interlock:** When a critical fall or emergency alert is registered, the platform issues an immediate hardware pump shutdown command.
7. **20-Second Fall Cancellation Window:** Farmers have a 20-second graceful cancellation window on both dashboard and physical hardware button to cancel false alarms before buzzer and family SMS escalation.

---

## 2. Technology Stack

### Frontend
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS with custom AgriShield agricultural palette
- **Theme:** Persistent Dark Charcoal Mode (`dark`) and Clean Light Mode
- **Multilingual Support:** `i18next` with complete translations for **English**, **ಕನ್ನಡ (Kannada)**, and **हिन्दी (Hindi)**
- **Visualization:** Recharts for historical telemetry graphs plotted strictly from database records
- **Icons:** Lucide React

### Backend
- **Framework:** Python FastAPI
- **Real-Time Communication:** WebSockets (`/ws`) with authenticated broadcasting
- **ORM & Database:** SQLAlchemy with MySQL (`agrishield_schema.sql`) and zero-configuration SQLite fallback
- **Security:** Bcrypt password hashing, JWT Bearer tokens, and SHA-256 device API key hashing
- **Computer Vision:** OpenCV Headless for aerosol spray mist dispersion verification
- **Reporting:** Streaming CSV and ReportLab PDF generators

### Hardware
- **ESP32 DevKit V1:** Dual-core 240MHz microcontroller with Wi-Fi & Bluetooth
- **Sensors:**
  - MQ-135 Air Quality / Hazardous Gas Sensor (connected to ADC1_CH6 / GPIO 34)
  - DHT11 Temperature & Relative Humidity Sensor (GPIO 4)
  - MPU-6050 6-Axis Motion & Attitude Sensor (I2C SDA: GPIO 21, SCL: GPIO 22)
  - NEO-6M GPS Module (Hardware Serial2 RX: GPIO 16, TX: GPIO 17)
- **Actuators & Safety Interfaces:**
  - Optically-isolated relay module for high-pressure spray pump (GPIO 26) with flyback diode protection
  - Transistor-driven 85dB emergency buzzer (GPIO 27)
  - Status LEDs: Normal Green (GPIO 2), Emergency Red (GPIO 25)
  - Hardware physical emergency stop button (GPIO 32, Active LOW)
  - Fall alarm cancellation button (GPIO 33, Active LOW)
- **ESP32-CAM (AI-Thinker):** OV2640 camera module streaming field snapshots to the backend

---

## 3. Database Architecture (14 MySQL Tables)

The database schema is fully defined in [`backend/agrishield_schema.sql`](file:///c:/Users/ASUS/Music/AGRISHIELD/backend/agrishield_schema.sql) and implemented in [`backend/app/models.py`](file:///c:/Users/ASUS/Music/AGRISHIELD/backend/app/models.py):

1. `users` — Authentication credentials, roles (`ADMIN`, `FARMER`), and account status.
2. `farmer_profiles` — Personal identity, phone, village, district, emergency kin contact.
3. `devices` — Registered ESP32 DevKit and ESP32-CAM units, hashed API keys, firmware versions.
4. `farmer_devices` — Relational assignment linking specific hardware units to farmers.
5. `device_heartbeats` — Heartbeat reception timestamps, RSSI signal, and battery metrics.
6. `sensor_readings` — Time-series storage of raw ADC values, calibrated values, units, and validity flags.
7. `camera_images` — Image references, file sizes, timestamps, and OpenCV spray detection flags.
8. `fall_events` — 3-axis accelerometer and gyroscope vectors, status (`POSSIBLE`, `CONFIRMED`, `CANCELLED`), countdown timestamps.
9. `pump_events` — Command actuation logs, manual vs automatic triggers, and hardware ACK timestamps.
10. `gps_locations` — Latitude, longitude, altitude, speed, fix quality, and satellites count.
11. `emergency_alerts` — Event-driven critical incidents with unique event UIDs and resolution status.
12. `notifications` — SMS and email delivery audit trail for family dispatch.
13. `user_settings` — Multilingual choice, theme choice, cancellation duration, and warning thresholds.
14. `audit_logs` — System access and security audit trail.

---

## 4. Hardware Wiring & Pinout Guide

Full electrical diagrams and isolation instructions are documented in [`hardware/esp32_devkit_v1/wiring_diagram.md`](file:///c:/Users/ASUS/Music/AGRISHIELD/hardware/esp32_devkit_v1/wiring_diagram.md).

```
ESP32 DevKit V1 Pinout Summary:
==================================================
GPIO 34 (ADC1_CH6) <--- MQ-135 Analog Gas Output
GPIO 4             <--- DHT11 Data (10k Pull-up to 3.3V)
GPIO 21 (SDA)      <--- MPU-6050 I2C SDA
GPIO 22 (SCL)      <--- MPU-6050 I2C SCL
GPIO 16 (RX2)      <--- NEO-6M GPS TX
GPIO 17 (TX2)      ---> NEO-6M GPS RX
GPIO 26 (OUTPUT)   ---> Optocoupled Relay Driver (Spray Pump)
GPIO 27 (OUTPUT)   ---> 2N2222 Transistor Base (85dB Buzzer)
GPIO 2  (OUTPUT)   ---> Green Status LED
GPIO 25 (OUTPUT)   ---> Red Emergency LED
GPIO 32 (INPUT_PU) <--- Physical Emergency Stop Button
GPIO 33 (INPUT_PU) <--- Fall Alarm Cancellation Button
```

---

## 5. Quick Start Instructions

### Starting the FastAPI Backend
Double-click `run_backend.bat` or run:
```powershell
$env:PYTHONPATH = "$pwd\backend"
.\py_embed\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend initializes the database and creates the default Administrator:
- **Email:** `admin@agrishield.io`
- **Password:** `Admin@AgriShield2026`
- **Initial Hardware Unit:** `ESP32_AGRI_01` (Key: `agrishield_secret_key_2026`)

### Starting the React Frontend
Double-click `run_frontend.bat` or run:
```powershell
cd frontend
npm.cmd run dev
```
Open your browser to: `http://localhost:5173`

### Starting the Hardware Simulator (Testing Mode)
Double-click `run_simulator.bat` or run:
```powershell
$env:PYTHONPATH = "$pwd\backend"
.\py_embed\python.exe hardware\simulator\agrishield_hardware_client.py --action loop
```
This sends genuine authenticated heartbeats, sensor telemetry, GPS coordinates, and listens for remote pump commands.
