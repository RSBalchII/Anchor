@echo off
SETLOCAL EnableDelayedExpansion

TITLE ECE Core - Sovereign Context Engine - Launcher

echo ========================================================
echo   Sovereign Context Engine (ECE) - Electron Launcher
echo ========================================================
echo.

:: 1. Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js v18+ from https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Check for PNPM
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARN] PNPM is not installed. Installing via NPM...
    call npm install -g pnpm
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install PNPM.
        pause
        exit /b 1
    )
    echo [OK] PNPM installed successfully.
)

:: 3. Dependency Hygiene (Root)
if not exist "node_modules" (
    echo [INFO] First time setup [Root]: Installing dependencies...
    call pnpm install
)

:: 4. Dependency Hygiene (Desktop Overlay)
if not exist "desktop-overlay\node_modules" (
    echo [INFO] First time setup [Overlay]: Installing dependencies...
    cd desktop-overlay
    call npm install
    cd ..
)

:: 5. Build System
echo.
echo [INFO] Building Frontend ^& Engine...
call pnpm build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed. Please check the logs above.
    pause
    exit /b 1
)

echo [INFO] Building Desktop Overlay...
cd desktop-overlay
call npm run build
cd ..

echo [OK] Build successful.

:: 6. Launch Electron
echo.
echo [INFO] Launching ECE Desktop Environment...
echo [INFO] The Dashboard will open automatically when the Engine is ready.
echo.

cd desktop-overlay
call npm start

pause
