@echo off
echo ⚓ STARTING ANCHOR SYSTEM IN BACKGROUND...

REM 1. Start the Unified Server (Truly Background - no window)
start "Anchor Core" /min cmd /c "cd tools && python webgpu_bridge.py"

REM 2. Wait for Server to initialize
timeout /t 3 /nobreak >nul

REM 3. Launch the Ghost Engine (Truly Background - no window)
REM Points to the new chat.html on the single port in headless mode
start "Ghost Engine" /min cmd /c "msedge --app=http://localhost:8000/chat.html?headless=true --start-minimized --remote-debugging-port=9222 --no-first-run --no-default-browser-check --disable-extensions --disable-plugins --disable-images --disable-javascript --disable-web-security --user-data-dir=%TEMP%\anchor_ghost"
REM OR use chrome if edge is missing:
REM start "Ghost Engine" /min cmd /c "chrome --app=http://localhost:8000/chat.html?headless=true --start-minimized --no-first-run --no-default-browser-check --disable-extensions --disable-plugins --disable-images --disable-javascript --disable-web-security --user-data-dir=%TEMP%\anchor_ghost"

echo.
echo ✅ Anchor System Started in Background
echo    Open http://localhost:8000 in your browser when ready
echo    Services will start automatically when you access the UI
echo.