@echo off
echo ========================================================
echo Starting AgriShield IoT Hardware Simulator
echo Transmitting authentic ESP32 DevKit and ESP32-CAM telemetry
echo ========================================================
cd %~dp0
set PYTHONPATH=%~dp0backend
"%~dp0py_embed\python.exe" "%~dp0hardware\simulator\agrishield_hardware_client.py" --action loop
pause
