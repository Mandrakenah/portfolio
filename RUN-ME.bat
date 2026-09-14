@echo off
title Portfolio setup
cd /d "%~dp0"
echo.
echo  Setting up your portfolio. This takes 2-3 minutes.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
echo.
echo  ---- Finished. You can close this window. ----
echo.
pause
