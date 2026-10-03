@echo off
title Train the portfolio model
cd /d "%~dp0"
echo Starting, please wait...
echo.

python train_local.py
if %errorlevel%==9009 goto trypy
goto done

:trypy
py train_local.py
if %errorlevel%==9009 goto nopython
goto done

:nopython
echo.
echo Python was not found on this computer.
echo Install it from python.org and tick "Add python.exe to PATH".

:done
echo.
pause
