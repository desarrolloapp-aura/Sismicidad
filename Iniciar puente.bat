@echo off
cd /d "%~dp0"
title Puente sismico El Teniente
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0registrar-puente.ps1"
