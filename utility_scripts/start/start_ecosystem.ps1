# PowerShell script to start the ECE ecosystem: Redis, Neo4j, and all ECE agents
# With on-demand model management via ModelManager

# Create logs directory if it doesn't exist
$logsDir = "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force
}

# Function to write timestamped messages to both console and log file
function Write-LogMessage {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [string]$Component = "ecosystem",
        [int]$Line = 1
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "$timestamp [$Level] ${Component}:$Line - $Message"
    
    # Output to console
    switch ($Level) {
        "ERROR" { Write-Host $logEntry -ForegroundColor Red }
        "WARNING" { Write-Host $logEntry -ForegroundColor Yellow }
        "INFO" { Write-Host $logEntry -ForegroundColor Green }
        default { Write-Host $logEntry }
    }
    
    # Append to log file
    $logEntry | Out-File -FilePath "logs/debug_log_ecosystem.txt" -Append -Encoding UTF8
}

Write-LogMessage "External Context Engine (ECE) Ecosystem Starter" -Level "INFO"
Write-LogMessage "=============================================" -Level "INFO"

# Change to project root directory
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $projectRoot

Write-LogMessage "Starting Redis and Neo4j services..." -Level "INFO"
try {
    $dockerOutput = docker compose up -d 2>&1
    $dockerOutput | ForEach-Object { Write-LogMessage $_ -Level "DEBUG" }
    
    if ($LASTEXITCODE -ne 0) {
        throw "Docker compose command failed"
    }
    Write-LogMessage "✓ Redis and Neo4j services started successfully" -Level "INFO"
}
catch {
    Write-LogMessage "✗ Failed to start Docker services: $_" -Level "ERROR"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-LogMessage "Updating configuration for on-demand model management..." -Level "INFO"

Write-LogMessage "Configuring ECE for on-demand model management..." -Level "INFO"
try {
    # The ModelManager will handle model selection and loading as needed
    Write-LogMessage "✓ ECE configured for on-demand model management via ModelManager" -Level "INFO"
}
catch {
    Write-LogMessage "✗ Failed during model configuration update: $_" -Level "ERROR"
    # Continue anyway since model will be managed on-demand
}

Write-LogMessage "Waiting 10 seconds for services to initialize..." -Level "INFO"
Start-Sleep -Seconds 10

Write-LogMessage "Starting ECE agents with memory management..." -Level "INFO"
try {
    # Start the agents with Python, redirecting output to the ecosystem log file
    Write-LogMessage "Starting run_all_agents.py..." -Level "INFO"
    
    # Use PowerShell's Start-Process to capture output
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "uv"
    $psi.Arguments = "run run_all_agents.py"
    $psi.WorkingDirectory = $projectRoot
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $false
    
    $process = [System.Diagnostics.Process]::Start($psi)
    $output = $process.StandardOutput.ReadToEnd()
    $errorOutput = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    
    # Log all output from the Python process
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $outputLines = $output -split "`n"
    foreach ($line in $outputLines) {
        if ($line.Trim() -ne "") {
            $logEntry = "$timestamp [INFO] ecosystem:1 - $line"
            $logEntry | Out-File -FilePath "logs/debug_log_ecosystem.txt" -Append -Encoding UTF8
        }
    }
    
    if ($process.ExitCode -ne 0) {
        $errorLines = $errorOutput -split "`n"
        foreach ($line in $errorLines) {
            if ($line.Trim() -ne "") {
                $logEntry = "$timestamp [ERROR] ecosystem:1 - $line"
                $logEntry | Out-File -FilePath "logs/debug_log_ecosystem.txt" -Append -Encoding UTF8
            }
        }
        throw "ECE agents failed to start with exit code: $($process.ExitCode)"
    }
    
    Write-LogMessage "✓ ECE agents started successfully" -Level "INFO"
}
catch {
    Write-LogMessage "✗ Failed to start ECE agents: $_" -Level "ERROR"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-LogMessage "" -Level "INFO"
Write-LogMessage "ECE ecosystem is running!" -Level "INFO"
Write-LogMessage "- Redis: localhost:6379" -Level "INFO"
Write-LogMessage "- Neo4j: localhost:7687" -Level "INFO"
Write-LogMessage "- ECE Orchestrator: localhost:8000" -Level "INFO"
Write-LogMessage "- Other agents on ports 8001-8007" -Level "INFO"

Read-Host "Press Enter to exit"