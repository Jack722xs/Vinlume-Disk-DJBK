@echo off
title Vinlume Disk
mode con cols=80 lines=40
cd /d "%~dp0"
where python >nul 2>&1
if %errorlevel%==0 (python iniciar.py %*) else (py iniciar.py %*)
pause
