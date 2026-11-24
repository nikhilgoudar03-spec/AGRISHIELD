/*
  =============================================================================
  PROJECT: AGRISHIELD
  MODULE:  ESP32-CAM (AI-Thinker OV2640) Visual Safety & Spray Monitor
  FIRMWARE VERSION: 1.2-CAM
  =============================================================================
*/

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>

// Wi-Fi Credentials
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend API configuration
const char* API_HOST      = "http://192.168.1.100:8000";
const char* DEVICE_UID    = "ESP32_CAM_01";
const char* DEVICE_KEY    = "agrishield_secret_key_2026";
const int   DEVICE_DB_ID  = 2;

// ================= AI-THINKER CAMERA PIN DEFINITIONS =================
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

#define FLASH_LED_PIN      4

unsigned long lastCaptureTime = 0;
const unsigned long CAPTURE_INTERVAL = 15000; // Capture snapshot every 15s

void initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 12;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 16;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[AgriShield CAM] Camera init failed with error 0x%x\n", err);
    return;
  }
  Serial.println("[AgriShield CAM] OV2640 Initialized successfully.");
}

void uploadFrame(camera_fb_t* fb) {
  if (WiFi.status() != WL_CONNECTED || !fb) return;

  WiFiClient client;
  String host = "192.168.1.100"; // Extracted from API_HOST
  int port = 8000;

  if (!client.connect(host.c_str(), port)) {
    Serial.println("[AgriShield CAM] Connection to backend failed.");
    return;
  }

  String boundary = "----AgriShieldBoundary" + String(millis());
  String head = "--" + boundary + "\r\n" +
                "Content-Disposition: form-data; name=\"file\"; filename=\"capture.jpg\"\r\n" +
                "Content-Type: image/jpeg\r\n\r\n";
  String tail = "\r\n--" + boundary + "--\r\n";

  size_t totalLen = head.length() + fb->len + tail.length();

  client.println("POST /api/camera/upload HTTP/1.1");
  client.println("Host: " + host + ":" + String(port));
  client.println("X-Device-Uid: " + String(DEVICE_UID));
  client.println("X-Device-Key: " + String(DEVICE_KEY));
  client.println("Content-Type: multipart/form-data; boundary=" + boundary);
  client.println("Content-Length: " + String(totalLen));
  client.println("Connection: close");
  client.println();

  client.print(head);
  client.write(fb->buf, fb->len);
  client.print(tail);

  Serial.printf("[AgriShield CAM] Uploaded frame: %d bytes\n", fb->len);
  client.stop();
}

void setup() {
  Serial.begin(115200);
  pinMode(FLASH_LED_PIN, OUTPUT);
  digitalWrite(FLASH_LED_PIN, LOW); // Flash off

  initCamera();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\n[AgriShield CAM] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
}

void loop() {
  unsigned long now = millis();

  if (now - lastCaptureTime >= CAPTURE_INTERVAL) {
    lastCaptureTime = now;

    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("[AgriShield CAM] Camera frame capture failed");
      return;
    }

    uploadFrame(fb);
    esp_camera_fb_return(fb);
  }
}
