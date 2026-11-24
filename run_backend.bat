@echo off
echo ========================================================
echo Starting AgriShield Backend Server (FastAPI + Uvicorn)
echo ========================================================
cd %~dp0
set PYTHONPATH=%~dp0backend
"%~dp0py_embed\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
