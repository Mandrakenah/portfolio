@echo off
title Update live site
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0UPDATE.ps1"
echo.
pause
