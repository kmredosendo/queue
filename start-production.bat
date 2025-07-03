@echo off
REM Queue System - Windows Startup Script

echo Starting Queue System Production Server...

REM Change to the production directory
cd /d "%~dp0"

REM Start with PM2 (silent)
pm2 start ecosystem.config.js > nul 2>&1

REM Check if started successfully
pm2 status queue-system > nul 2>&1
if %ERRORLEVEL% == 0 (
    echo Queue System started successfully!
    echo Access: http://localhost:3000
) else (
    echo Failed to start Queue System
    pause
)
