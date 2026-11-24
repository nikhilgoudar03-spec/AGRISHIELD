# AgriShield ESP32 DevKit V1 Hardware Specification & Wiring Guide

This document specifies the exact, safe electrical wiring for the **AgriShield Telemetry and Safety Controller** based on the standard **ESP32 DevKit V1 (30-pin / 36-pin)** microcontroller.

---

## 1. Verified GPIO Pin Allocation Table

> **CRITICAL ADC NOTE:** On the ESP32, **ADC2 pins are internally shared with the Wi-Fi module** and cannot be used for analog reads when Wi-Fi is transmitting. Therefore, the **MQ-135 is connected strictly to ADC1_CH6 (GPIO 34)** which is read-only and unaffected by Wi-Fi.

| Sensor / Component | Sensor Pin | ESP32 DevKit V1 Pin | Electrical Notes |
| :--- | :--- | :--- | :--- |
| **MQ-135 Air Quality** | AOUT (Analog Out) | **GPIO 34** (ADC1_CH6) | Requires 5V VCC for internal heater coil. Voltage divider (2kΩ / 3.3kΩ) or 3.3V analog output ensures ESP32 ADC protection (0–3.3V). |
| | VCC | **VIN (5V External)** | Heater draws ~150mA. Do not power from ESP32 3.3V pin. |
| | GND | **GND** | Common ground with ESP32. |
| **DHT11 Temp & Humidity** | DATA | **GPIO 4** | 10kΩ pull-up resistor between DATA and 3.3V. |
| | VCC | **3V3** | 3.3V DC logic. |
| | GND | **GND** | Common ground. |
| **MPU-6050 Motion (IMU)** | SDA | **GPIO 21** | Hardware I2C data line (4.7kΩ pull-up to 3.3V). |
| | SCL | **GPIO 22** | Hardware I2C clock line (4.7kΩ pull-up to 3.3V). |
| | VCC | **3V3** | Connect to 3.3V. |
| | GND | **GND** | Common ground. |
| **NEO-6M GPS Module** | TXD | **GPIO 16** (RX2) | Hardware Serial2 RX on ESP32. |
| | RXD | **GPIO 17** (TX2) | Hardware Serial2 TX on ESP32 (via voltage divider if GPS is strictly 3.3V). |
| | VCC | **VIN (5V)** / **3V3** | Most NEO-6M breakout boards contain an on-board 3.3V LDO regulator. |
| | GND | **GND** | Common ground. |
| **Sprayer Pump Relay** | IN (Trigger) | **GPIO 26** | **NEVER connect pump directly to GPIO.** Connect to optically-isolated relay module driver. Active HIGH. |
| | VCC | **VIN (5V)** | Isolated coil supply. |
| | GND | **GND** | Common ground. |
| **Emergency Buzzer** | (+) Anode | **GPIO 27** | Driven via 2N2222 NPN transistor with 1kΩ base resistor. |
| **Emergency Red LED** | Anode | **GPIO 25** | Current limiting 330Ω resistor to ground. |
| **Normal Green LED** | Anode | **GPIO 2** | Current limiting 330Ω resistor to ground (or onboard LED). |
| **Hardware Emergency Stop** | Push Button | **GPIO 32** | Active LOW with internal `INPUT_PULLUP`. Normally open button to GND. |
| **Alarm Cancel Button** | Push Button | **GPIO 33** | Active LOW with internal `INPUT_PULLUP`. Normally open button to GND. |

---

## 2. Safety & Electrical Isolation Rules

1. **Pump Relay Drive Isolation:**
   - Agricultural 12V/24V high-pressure diaphragm spray pumps draw inductive current surges up to 4–8A.
   - The pump MUST be powered from an independent 12V lead-acid battery or DC-DC step-down converter.
   - Always wire a **1N4007 or 1N5408 flyback protection diode** in reverse-bias across the DC pump motor terminals to suppress inductive voltage spikes that would otherwise damage or reset the microcontroller.
   - Use an optocoupled relay board (e.g. Songle 10A 250VAC / 30VDC).

2. **Power Supply & Filtering:**
   - Use a dedicated 5V 2A regulator (e.g. LM2596 buck converter from tractor/pack battery).
   - Place a 100μF electrolytic capacitor across 5V and GND near the ESP32 to absorb Wi-Fi transmission power bursts.

3. **Physical Emergency Fail-Safe:**
   - In the event of microcontroller reset or brown-out, the relay driver defaults to **OFF** (de-energized), ensuring pump cutoff.
