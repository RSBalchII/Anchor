# Simple ECE Ecosystem Starter (PowerShell Version)
# This script starts Docker services and runs all ECE agents

Write-Host "External Context Engine (ECE) Simple Starter" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green

# Start Docker services (Redis and Neo4j)
Write-Host "Starting Redis and Neo4j services..." -ForegroundColor Yellow
try {
    docker-compose up -d redis neo4j
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error starting Docker services" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    Write-Host "Docker services started successfully" -ForegroundColor Green
}
catch {
    Write-Host "Error starting Docker services: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Wait for services to initialize
Write-Host "Waiting 10 seconds for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Run all agents
Write-Host "Starting ECE agents..." -ForegroundColor Yellow
try {
    python run_all_agents.py
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error running ECE agents" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}
catch {
    Write-Host "Error running ECE agents: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "ECE ecosystem started successfully" -ForegroundColor Green
Read-Host "Press Enter to continue"