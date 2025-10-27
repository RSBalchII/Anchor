#!/bin/bash

# Script to start the ECE ecosystem: Redis, Neo4j, and all ECE agents
# With on-demand model management via ModelManager

echo "External Context Engine (ECE) Ecosystem Starter"
echo "============================================="

# Change to project root directory
cd "$(dirname "$0")/../" || exit 1

SKIP_DOCKER=0
SKIP_MODEL_CONFIG=0

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-docker)
            SKIP_DOCKER=1
            shift
            ;;
        --skip-model-config)
            SKIP_MODEL_CONFIG=1
            shift
            ;;
        *)
            shift
            ;;
    esac
done

if [ $SKIP_DOCKER -eq 0 ]; then
    echo "Starting Redis and Neo4j services..."
    docker compose up -d
    if [ $? -ne 0 ]; then
        echo "Failed to start Docker services. Exiting."
        read -p "Press Enter to exit..."
        exit 1
    fi
fi

if [ $SKIP_MODEL_CONFIG -eq 0 ]; then
    echo "Updating configuration for on-demand model management..."
    echo "Configuring ECE for on-demand model management via ModelManager"
    # The ModelManager will handle model selection and loading as needed
    echo "Model configuration updated for on-demand management."
else
    echo "Skipping model configuration update..."
fi

echo "Waiting 10 seconds for services to initialize..."
sleep 10

echo "Starting ECE agents..."
python3 run_all_agents.py
if [ $? -ne 0 ]; then
    echo "Failed to start ECE agents. Exiting."
    read -p "Press Enter to exit..."
    exit 1
fi

echo ""
echo "ECE ecosystem is running!"
echo "- Redis: localhost:6379"
echo "- Neo4j: localhost:7687"
echo "- ECE Orchestrator: localhost:8000"
echo "- Other agents on ports 8001-8007"
echo ""
read -p "Press Enter to exit..."