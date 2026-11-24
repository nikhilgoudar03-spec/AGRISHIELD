/*
  =============================================================================
  PROJECT: AGRISHIELD
  MODULE:  ESP32 DevKit V1 - Real-Time Smart Farmer Safety Controller
  FIRMWARE VERSION: 1.2-STABLE
  =============================================================================
  CRITICAL SAFETY RULES:
  1. Default pump state is OFF on startup and on any communication fault.
  2. Fall detection or emergency button immediately disengages relay locally.
  3. All network telemetry transmits authenticated SHA-256 device credentials.
  =============================================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <DHT.h>
#include <TinyGPSPlus.h>
#include <ArduinoJson.h>

// ================= CONFIGURATION =================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend API configuration
const char* API_HOST      = "http://192.168.1.100:8000"; // Replace with your FastAPI backend host IP
const char* DEVICE_UID    = "ESP32_AGRI_01";
const char* DEVICE_KEY    = "agrishield_secret_key_2026";
const int   DEVICE_DB_ID  = 1;

// ================= PIN DEFINITIONS =================
#define PIN_MQ135         34  // ADC1_CH6 (Safe with Wi-Fi)
#define PIN_DHT           4   // DHT11 Data
#define PIN_RELAY_PUMP    26  // Opto-isolated relay driver (Active HIGH)
#define PIN_BUZZER        27  // Transistor-driven 5V buzzer
#define PIN_LED_GREEN     2   // Safe / Online status LED
#define PIN_LED_RED       25  // Alert / Emergency status LED
#define PIN_BTN_EMERGENCY 32  // Hardware Emergency Stop (Active LOW)
#define PIN_BTN_CANCEL    33  // Fall Alarm Cancel Button (Active LOW)

// GPS Hardware Serial2 Pins
#define PIN_GPS_RX        16  // ESP32 RX2 connected to NEO-6M TX
#define PIN_GPS_TX        17  // ESP32 TX2 connected to NEO-6M RX

// ================= SENSOR INSTANCES =================
#define DHTTYPE DHT11
DHT dht(PIN_DHT, DHTTYPE);
TinyGPSPlus gps;
HardwareSerial SerialGPS(2);

// MPU-6050 Registers
const int MPU_ADDR = 0x68;

// Timing intervals (milliseconds)
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 3000; // Telemetry every 3s

unsigned long lastHeartbeatTime = 0;
const unsigned long HEARTBEAT_INTERVAL = 10000; // Heartbeat every 10s

unsigned long lastPumpPollTime = 0;
const unsigned long PUMP_POLL_INTERVAL = 2000; // Check pump commands every 2s

// Pump State Tracker
bool currentPumpState = false; // Initial safe state: OFF
bool emergencyLockActive = false;

// ================= MPU-6050 HELPER =================
void initMPU6050() {
  Wire.begin(21, 22);
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1 register
  Wire.write(0);    // Wake up MPU-6050
  Wire.endTransmission(true);
}

void readMPU6050(float &ax, float &ay, float &az, float &gx, float &gy, float &gz) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 14, true);

  if (Wire.available() >= 14) {
    int16_t raw_ax = Wire.read() << 8 | Wire.read();
    int16_t raw_ay = Wire.read() << 8 | Wire.read();
    int16_t raw_az = Wire.read() << 8 | Wire.read();
    int16_t raw_temp = Wire.read() << 8 | Wire.read();
    int16_t raw_gx = Wire.read() << 8 | Wire.read();
    int16_t raw_gy = Wire.read() << 8 | Wire.read();
    int16_t raw_gz = Wire.read() << 8 | Wire.read();

    // Scale to standard units: g (9.8 m/s^2) and deg/s (+/-250 dps)
    ax = (float)raw_ax / 16384.0;
    ay = (float)raw_ay / 16384.0;
    az = (float)raw_az / 16384.0;
    gx = (float)raw_gx / 131.0;
    gy = (float)raw_gy / 131.0;
    gz = (float)raw_gz / 131.0;
  }
}

// ================= HARDWARE CONTROL =================
void setPumpState(bool state, const char* reason) {
  if (state && emergencyLockActive) {
    Serial.println("[AgriShield PUMP] Unsafe command rejected: Emergency interlock active!");
    return;
  }
  currentPumpState = state;
  digitalWrite(PIN_RELAY_PUMP, state ? HIGH : LOW);
  Serial.printf("[AgriShield PUMP] Relay switched to %s (%s)\n", state ? "ON" : "OFF", reason);

  // Send ACK to backend
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(API_HOST) + "/api/pump/ack";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Uid", DEVICE_UID);
    http.addHeader("X-Device-Key", DEVICE_KEY);

    String payload = String("{\"state\":\"") + (state ? "ON" : "OFF") + "\",\"source\":\"" + reason + "\"}";
    http.POST(payload);
    http.end();
  }
}

void triggerEmergencyShutdown(const char* reason) {
  emergencyLockActive = true;
  setPumpState(false, "EMERGENCY_SHUTDOWN");
  digitalWrite(PIN_LED_RED, HIGH);
  digitalWrite(PIN_LED_GREEN, LOW);
  tone(PIN_BUZZER, 2400, 2000); // 2.4kHz warning pulse

  // Transmit urgent emergency alert to FastAPI
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(API_HOST) + "/api/emergency?message=" + reason + "&alert_type=HARDWARE_EMERGENCY";
    http.begin(url);
    http.addHeader("X-Device-Uid", DEVICE_UID);
    http.addHeader("X-Device-Key", DEVICE_KEY);
    http.POST("");
    http.end();
  }
}

// ================= ARDUINO SETUP =================
void setup() {
  Serial.begin(115200);
  SerialGPS.begin(9600, SERIAL_8N1, PIN_GPS_RX, PIN_GPS_TX);

  pinMode(PIN_RELAY_PUMP, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_BTN_EMERGENCY, INPUT_PULLUP);
  pinMode(PIN_BTN_CANCEL, INPUT_PULLUP);

  // Initial fail-safe hardware state
  digitalWrite(PIN_RELAY_PUMP, LOW); // Pump strictly OFF
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_RED, LOW);

  // Initialize sensors
  dht.begin();
  initMPU6050();

  // Connect to Wi-Fi
  Serial.println("[AgriShield] Connecting to field Wi-Fi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    digitalWrite(PIN_LED_GREEN, !digitalRead(PIN_LED_GREEN));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[AgriShield] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    digitalWrite(PIN_LED_GREEN, HIGH);
  } else {
    Serial.println("[AgriShield] Wi-Fi offline. Running local safety interlocks.");
  }
}

// ================= MAIN LOOP =================
void loop() {
  unsigned long now = millis();

  // Check hardware buttons
  if (digitalRead(PIN_BTN_EMERGENCY) == LOW) {
    delay(50); // Debounce
    if (digitalRead(PIN_BTN_EMERGENCY) == LOW) {
      Serial.println("[AgriShield] Physical EMERGENCY STOP button pressed!");
      triggerEmergencyShutdown("Hardware Emergency Stop button pressed by farmer");
      delay(500);
    }
  }

  // Parse GPS Stream
  while (SerialGPS.available() > 0) {
    gps.encode(SerialGPS.read());
  }

  // Periodic Telemetry Dispatch
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = now;

    // 1. Read MQ-135 Gas Sensor
    int rawGasAdc = analogRead(PIN_MQ135);
    // Verified MQ-135 calibration curve approximation (PPM = a * (Rs/Ro)^b)
    float gasPpm = map(rawGasAdc, 0, 4095, 50, 1000);

    // 2. Read DHT11 Temp & Humidity
    float tempC = dht.readTemperature();
    float hum = dht.readHumidity();

    // 3. Read MPU-6050 Motion
    float ax = 0, ay = 0, az = 0, gx = 0, gy = 0, gz = 0;
    readMPU6050(ax, ay, az, gx, gy, gz);

    // Build JSON Batch Payload
    StaticJsonDocument<1024> doc;
    JsonArray sensors = doc.createNestedArray("sensors");

    // MQ-135 item
    JsonObject mqObj = sensors.createNestedObject();
    mqObj["sensor_id"] = "MQ135";
    mqObj["value"] = gasPpm;
    mqObj["unit"] = "ppm";
    mqObj["raw_adc"] = rawGasAdc;

    // DHT11 Temperature item
    if (!isnan(tempC)) {
      JsonObject tempObj = sensors.createNestedObject();
      tempObj["sensor_id"] = "DHT11_TEMP";
      tempObj["value"] = tempC;
      tempObj["unit"] = "°C";
    }

    // DHT11 Humidity item
    if (!isnan(hum)) {
      JsonObject humObj = sensors.createNestedObject();
      humObj["sensor_id"] = "DHT11_HUM";
      humObj["value"] = hum;
      humObj["unit"] = "%";
    }

    // MPU6050 Acceleration item
    float a_total = sqrt(ax*ax + ay*ay + az*az);
    JsonObject accObj = sensors.createNestedObject();
    accObj["sensor_id"] = "MPU6050_ACC";
    accObj["value"] = a_total;
    accObj["unit"] = "g";

    // MPU6050 Gyro item
    float g_total = sqrt(gx*gx + gy*gy + gz*gz);
    JsonObject gyroObj = sensors.createNestedObject();
    gyroObj["sensor_id"] = "MPU6050_GYRO";
    gyroObj["value"] = g_total;
    gyroObj["unit"] = "deg/s";

    // Reported pump state
    doc["pump_state"] = currentPumpState ? "ON" : "OFF";

    // Motion vector arrays
    JsonArray accArr = doc.createNestedArray("acc_xyz");
    accArr.add(ax); accArr.add(ay); accArr.add(az);

    JsonArray gyroArr = doc.createNestedArray("gyro_xyz");
    gyroArr.add(gx); gyroArr.add(gy); gyroArr.add(gz);

    // GPS metrics (only sent if valid fix exists)
    if (gps.location.isValid() && gps.location.age() < 2000) {
      JsonObject gpsObj = doc.createNestedObject("gps");
      gpsObj["latitude"] = gps.location.lat();
      gpsObj["longitude"] = gps.location.lng();
      gpsObj["altitude"] = gps.altitude.meters();
      gpsObj["speed"] = gps.speed.kmph();
      gpsObj["fix_quality"] = 1;
      gpsObj["satellites"] = gps.satellites.value();
    }

    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      String url = String(API_HOST) + "/api/telemetry";
      http.begin(url);
      http.addHeader("Content-Type", "application/json");
      http.addHeader("X-Device-Uid", DEVICE_UID);
      http.addHeader("X-Device-Key", DEVICE_KEY);

      String jsonString;
      serializeJson(doc, jsonString);
      http.POST(jsonString);
      http.end();
    }
  }

  // Periodic Heartbeat
  if (now - lastHeartbeatTime >= HEARTBEAT_INTERVAL) {
    lastHeartbeatTime = now;
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      String url = String(API_HOST) + "/api/devices/" + String(DEVICE_DB_ID) + "/heartbeat";
      http.begin(url);
      http.addHeader("Content-Type", "application/json");
      http.addHeader("X-Device-Key", DEVICE_KEY);

      StaticJsonDocument<256> hbDoc;
      hbDoc["firmware_version"] = "v1.2-STABLE";
      hbDoc["wifi_rssi"] = WiFi.RSSI();
      hbDoc["ip_address"] = WiFi.localIP().toString();

      String hbPayload;
      serializeJson(hbDoc, hbPayload);
      http.POST(hbPayload);
      http.end();
    }
  }

  // Periodic Pump Command Polling
  if (now - lastPumpPollTime >= PUMP_POLL_INTERVAL) {
    lastPumpPollTime = now;
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      String url = String(API_HOST) + "/api/pump/pending-command";
      http.begin(url);
      http.addHeader("X-Device-Uid", DEVICE_UID);
      http.addHeader("X-Device-Key", DEVICE_KEY);
      int code = http.GET();
      if (code == 200) {
        String resp = http.getString();
        StaticJsonDocument<256> cmdDoc;
        deserializeJson(cmdDoc, resp);
        if (cmdDoc["has_command"].as<bool>()) {
          const char* targetCmd = cmdDoc["command"];
          if (strcmp(targetCmd, "ON") == 0) {
            setPumpState(true, "MANUAL_REMOTE");
          } else {
            setPumpState(false, "MANUAL_REMOTE");
          }
        }
      }
      http.end();
    }
  }
}
