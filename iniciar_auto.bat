@echo off
title Vinlume Disk (auto)
mode con cols=80 lines=40
cd /d "%~dp0"
where python >nul 2>&1
if %errorlevel%==0 (python iniciar.py --auto) else (py iniciar.py --auto)
pause
