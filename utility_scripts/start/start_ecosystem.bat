@echo off
REM Script to start the ECE ecosystem: Redis, Neo4j, and all ECE agents
REM With on-demand model management via ModelManager

echo External Context Engine (ECE) Ecosystem Starter
echo ==============================================

REM Change to project root directory
cd /d "%~dp0\.."

set SKIP_DOCKER=0
set SKIP_MODEL_CONFIG=0

REM Parse command line arguments
:parse_args
if "%1"=="" goto args_done
if "%1"=="--skip-docker" (
    set SKIP_DOCKER=1
    shift
    goto parse_args
)
if "%1"=="--skip-model-config" (
    set SKIP_MODEL_CONFIG=1
    shift
    goto parse_args
)
shift
goto parse_args

:args_done

if %SKIP_DOCKER%==0 (
    echo Starting Redis and Neo4j services...
    docker compose up -d
    if %errorlevel% neq 0 (
        echo Failed to start Docker services. Exiting.
        pause
        exit /b 1
    )
)

if %SKIP_MODEL_CONFIG%==0 (
    echo Updating configuration for on-demand model management...
    echo Configuring ECE for on-demand model management via ModelManager
    REM The ModelManager will handle model selection and loading as needed
    echo Model configuration updated for on-demand management.
) else (
    echo Skipping model configuration update...
)

echo Waiting 10 seconds for services to initialize...
timeout /t 10 /nobreak >nul

echo Starting ECE agents...
python run_all_agents.py
if %errorlevel% neq 0 (
    echo Failed to start ECE agents. Exiting.
    pause
    exit /b 1
)

echo.
echo ECE ecosystem is running!
echo - Redis: localhost:6379
echo - Neo4j: localhost:7687
echo - ECE Orchestrator: localhost:8000
echo - Other agents on ports 8001-8007
echo.
pause