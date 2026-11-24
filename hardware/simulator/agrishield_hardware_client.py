"""
AgriShield IoT Hardware Simulator
Emulates real ESP32 DevKit V1 and ESP32-CAM communication over HTTP/REST and WebSockets.
Use this script to verify dashboard updates, fall alerts, pump commands, and OpenCV image processing.
"""

import sys
import time
import math
import io
import argparse
import httpx
from datetime import datetime

API_HOST = "http://127.0.0.1:8000/api"
DEVICE_UID = "ESP32_AGRI_01"
DEVICE_KEY = "agrishield_secret_key_2026"
DEVICE_DB_ID = 1

headers = {
    "X-Device-Uid": DEVICE_UID,
    "X-Device-Key": DEVICE_KEY,
    "Content-Type": "application/json"
}

def send_heartbeat():
    payload = {
        "firmware_version": "v1.2-STABLE",
        "battery_level": 94.5,
        "wifi_rssi": -58,
        "ip_address": "192.168.1.145"
    }
    url = f"{API_HOST}/devices/{DEVICE_DB_ID}/heartbeat"
    try:
        res = httpx.post(url, json=payload, headers={"X-Device-Key": DEVICE_KEY})
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Heartbeat sent: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"[ERROR] Heartbeat failed: {e}")

def send_telemetry(gas_adc=1150, temp_c=28.4, hum_pct=62.0, is_fall=False, pump_state="OFF"):
    # Calculate approximate calibrated PPM from ADC (standard MQ-135 curve)
    gas_ppm = round(50 + (gas_adc / 4095.0) * 700.0, 1)

    if is_fall:
        # High impact spike: a_total > 2.8g, high angular velocity
        ax, ay, az = 0.45, -2.85, 1.12
        gx, gy, gz = 120.0, -210.0, 95.0
    else:
        # Normal field movement / slight walking vibrations
        ax, ay, az = 0.05, 0.98, 0.12
        gx, gy, gz = 3.2, -1.8, 0.5

    a_mag = math.sqrt(ax**2 + ay**2 + az**2)
    g_mag = math.sqrt(gx**2 + gy**2 + gz**2)

    payload = {
        "sensors": [
            {
                "sensor_id": "MQ135",
                "value": gas_ppm,
                "unit": "ppm",
                "raw_adc": gas_adc
            },
            {
                "sensor_id": "DHT11_TEMP",
                "value": temp_c,
                "unit": "°C"
            },
            {
                "sensor_id": "DHT11_HUM",
                "value": hum_pct,
                "unit": "%"
            },
            {
                "sensor_id": "MPU6050_ACC",
                "value": round(a_mag, 2),
                "unit": "g"
            },
            {
                "sensor_id": "MPU6050_GYRO",
                "value": round(g_mag, 1),
                "unit": "deg/s"
            }
        ],
        "pump_state": pump_state,
        "acc_xyz": [ax, ay, az],
        "gyro_xyz": [gx, gy, gz],
        "gps": {
            "latitude": 12.52184,
            "longitude": 76.89512,
            "altitude": 680.0,
            "speed": 1.2,
            "fix_quality": 1,
            "satellites": 7
        }
    }

    try:
        res = httpx.post(f"{API_HOST}/telemetry", json=payload, headers=headers)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Telemetry sent (MQ135: {gas_ppm}ppm, Temp: {temp_c}°C, Hum: {hum_pct}%): {res.status_code}")
    except Exception as e:
        print(f"[ERROR] Telemetry dispatch failed: {e}")

def check_pump_commands(current_state="OFF"):
    try:
        res = httpx.get(f"{API_HOST}/pump/pending-command", headers=headers)
        if res.status_code == 200:
            data = res.json()
            if data.get("has_command"):
                target_cmd = data["command"]
                print(f"[PUMP COMMAND RECEIVED] Target State: {target_cmd}. Actuating hardware relay...")
                time.sleep(0.5) # Emulate relay coil contact delay
                ack_res = httpx.post(
                    f"{API_HOST}/pump/ack",
                    json={"state": target_cmd, "source": "DEVICE_RELAY_ACK"},
                    headers=headers
                )
                print(f"[PUMP ACK SENT] Hardware state confirmed: {target_cmd} - {ack_res.status_code}")
                return target_cmd
    except Exception as e:
        print(f"[ERROR] Pump poll failed: {e}")
    return current_state

def trigger_physical_emergency():
    try:
        res = httpx.post(
            f"{API_HOST}/emergency?message=Hardware Emergency Stop button pressed by farmer&alert_type=HARDWARE_EMERGENCY",
            headers=headers
        )
        print(f"[EMERGENCY BUTTON] Sent emergency alert: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"[ERROR] Emergency trigger failed: {e}")

def upload_camera_frame():
    """Uploads a generated field image frame to test OpenCV aerosol mist verification."""
    try:
        import cv2
        import numpy as np

        # Create realistic synthetic agricultural field frame (640x480)
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        # Sky and crops
        img[:240, :] = [180, 150, 100]  # Light sky
        img[240:, :] = [34, 110, 45]     # Green foliage crop field

        # Add simulated spray plume particles
        cv2.putText(img, "AGRISHIELD FIELD CAM #1", (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        cv2.putText(img, datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"), (30, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 255, 200), 1)

        # Draw mist dispersion aerosol plume
        for _ in range(300):
            pt = (int(np.random.normal(320, 80)), int(np.random.normal(280, 50)))
            cv2.circle(img, pt, np.random.randint(2, 6), (220, 230, 230), -1)

        _, buf = cv2.imencode(".jpg", img)
        files = {"file": ("esp32_cam_frame.jpg", io.BytesIO(buf.tobytes()), "image/jpeg")}
        
        cam_headers = {
            "X-Device-Uid": DEVICE_UID,
            "X-Device-Key": DEVICE_KEY,
        }
        res = httpx.post(f"{API_HOST}/camera/upload", files=files, headers=cam_headers)
        print(f"[CAMERA UPLOAD] Frame uploaded: {res.status_code} - {res.json()}")
    except Exception as e:
        print(f"[ERROR] Camera upload failed: {e}")

def run_loop():
    print(f"Starting continuous AgriShield hardware simulator for device: {DEVICE_UID}...")
    print("Transmitting authenticated heartbeats, sensor telemetry, and listening for pump commands.\n")

    current_pump = "OFF"
    t_count = 0

    while True:
        # 1. Heartbeat every 10s
        if t_count % 3 == 0:
            send_heartbeat()

        # 2. Check for pump commands from dashboard
        current_pump = check_pump_commands(current_pump)

        # 3. Telemetry every 3s
        gas = 1100 + int(math.sin(t_count * 0.2) * 150)
        temp = round(28.0 + math.sin(t_count * 0.1) * 2.0, 1)
        hum = round(65.0 + math.cos(t_count * 0.1) * 4.0, 1)
        send_telemetry(gas_adc=gas, temp_c=temp, hum_pct=hum, is_fall=False, pump_state=current_pump)

        # 4. Upload camera frame every 30s
        if t_count % 10 == 0:
            upload_camera_frame()

        t_count += 1
        time.sleep(3)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AgriShield Hardware Simulator")
    parser.add_argument("--action", choices=["heartbeat", "telemetry", "fall", "camera", "emergency", "loop"], default="loop")
    args = parser.parse_args()

    if args.action == "heartbeat":
        send_heartbeat()
    elif args.action == "telemetry":
        send_telemetry()
    elif args.action == "fall":
        print("Simulating fall event impact vector...")
        send_telemetry(is_fall=True)
    elif args.action == "camera":
        upload_camera_frame()
    elif args.action == "emergency":
        trigger_physical_emergency()
    else:
        run_loop()
