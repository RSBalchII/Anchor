@echo off
echo Starting Neo4j and Redis containers in the background...
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker is not running.
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

docker-compose up -d

echo.
echo Infrastructure services have been started.
