@echo off
echo ANCHOR: STARTING ANCHOR SYSTEM IN BACKGROUND...

REM Check for low-resource mode
if "%LOW_RESOURCE_MODE%"=="true" (
    echo MODE: Low-Resource Mode Enabled
) else (
    if "%CPU_ONLY_MODE%"=="true" (
        echo MODE: CPU-Only Mode Enabled
    ) else (
        if "%NO_RESURRECTION_MODE%"=="" (
            REM Default to no resurrection mode if not explicitly set
            set NO_RESURRECTION_MODE=true
        )
        if "%NO_RESURRECTION_MODE%"=="true" (
            echo MODE: No Resurrection Mode Enabled - Ghost Engine must be started manually
        )
    )
)

REM 1. Start the Unified Server (Truly Background - no window)
if "%LOW_RESOURCE_MODE%"=="true" (
    start "Anchor Core" /min cmd /c "cd tools && set LOW_RESOURCE_MODE=true && set NO_RESURRECTION_MODE=true && python webgpu_bridge.py"
) else (
    if "%CPU_ONLY_MODE%"=="true" (
        start "Anchor Core" /min cmd /c "cd tools && set CPU_ONLY_MODE=true && set NO_RESURRECTION_MODE=true && python webgpu_bridge.py"
    ) else (
        if "%NO_RESURRECTION_MODE%"=="true" (
            start "Anchor Core" /min cmd /c "cd tools && set NO_RESURRECTION_MODE=true && python webgpu_bridge.py"
        ) else (
            start "Anchor Core" /min cmd /c "cd tools && python webgpu_bridge.py"
        )
    )
)

REM 1.5 Start Watchdog (File Monitor)
start "Anchor Watchdog" /min cmd /c "cd tools && python anchor_watchdog.py"

REM 2. Wait for Server to initialize
echo Waiting for server to initialize...
timeout /t 5 /nobreak >nul

REM 3. Launch the Ghost Engine
if "%NO_RESURRECTION_MODE%"=="true" (
    echo GHOST: Ghost Engine resurrection disabled - start manually in browser
    echo INFO: Open ghost.html in your browser to connect to the Bridge
) else (
    REM Handled automatically by the Bridge (Resurrection Manager)
    echo GHOST: Ghost Engine managed by Bridge...
)

echo.
echo SUCCESS: Anchor System Started in Background
echo    Open http://localhost:8000 in your browser when ready
echo    Services will start automatically when you access the UI
echo.
echo INFO: For low-resource devices: set LOW_RESOURCE_MODE=true before running
echo INFO: For CPU-only: set CPU_ONLY_MODE=true before running
echo INFO: To enable auto-resurrection: set NO_RESURRECTION_MODE=false before running
echo.
if "%NO_RESURRECTION_MODE%"=="true" (
    echo MANUAL: Manual Ghost Engine Mode: Open ghost.html in your browser to connect
) else (
    echo AUTO: Ghost Engine should connect automatically to enable chat and memory search
)