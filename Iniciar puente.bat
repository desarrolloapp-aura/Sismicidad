@echo off
cd /d "%~dp0"
title Puente sismico El Teniente
net session >nul 2>&1
if %errorlevel% neq 0 (
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0arranque\iniciar-puente.ps1"
echo.
pause
