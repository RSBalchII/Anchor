@echo off
TITLE ECE Main Launcher

echo ===================================================
echo ==  External Context Engine (ECE) Launcher       ==
echo ===================================================
echo.

REM Step 1: Start the infrastructure (Neo4j, Redis)
echo [Step 1/2] Starting infrastructure services...
call start_infra.bat
if %errorlevel% neq 0 (
    echo.
    echo Failed to start infrastructure. Aborting.
    pause
    exit /b 1
)
echo.
echo Infrastructure is running.
echo.

REM Step 2: Start the ECE agents
echo [Step 2/2] Starting ECE agents...
echo This will occupy this terminal window. Press Ctrl+C to stop the agents.
echo.
REM Add the project root and utility_scripts to the Python path
set PYTHONPATH=%~dp0;%~dp0utility_scripts;%PYTHONPATH%
python run_all_agents.py

echo.
echo ECE agents have been stopped.
pause
