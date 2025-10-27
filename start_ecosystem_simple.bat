@echo off
REM Simple ECE Ecosystem Starter
REM This script starts Docker services and runs all ECE agents

echo External Context Engine (ECE) Simple Starter
echo ===========================================

REM Start Docker services (Redis and Neo4j)
echo Starting Redis and Neo4j services...
docker-compose up -d redis neo4j
if %errorlevel% neq 0 (
    echo Error starting Docker services
    exit /b %errorlevel%
)
echo Docker services started successfully

REM Wait for services to initialize
echo Waiting 10 seconds for services to initialize...
timeout /t 10 /nobreak >nul

REM Run all agents
echo Starting ECE agents...
python run_all_agents.py
if %errorlevel% neq 0 (
    echo Error running ECE agents
    exit /b %errorlevel%
)

echo ECE ecosystem started successfully
pause