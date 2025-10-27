#!/usr/bin/env python3
"""
Script to start the ECE ecosystem: Redis, Neo4j, and all ECE agents
With automatic model detection and configuration update
"""
import subprocess
import sys
import os
import time
import signal
import argparse
from pathlib import Path

def start_docker_services():
    """Start Redis and Neo4j using docker-compose"""
    print("Starting Redis and Neo4j services...")
    
    try:
        result = subprocess.run(['docker', 'compose', 'up', '-d'], 
                                check=True, capture_output=True, text=True)
        print("✓ Redis and Neo4j services started successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to start services: {e}")
        print(f"stdout: {e.stdout}")
        print(f"stderr: {e.stderr}")
        return False

def detect_and_update_model_config():
    """Update ECE configuration to use on-demand model management"""
    print("Configuring ECE for on-demand model management...")
    
    # The ModelManager will handle model selection and loading as needed
    print("✓ ECE configured for on-demand model management via ModelManager")
    return True

def start_ece_agents():
    """Start the ECE agents"""
    print("Starting ECE agents...")
    
    try:
        # Run the main run_all_agents.py script
        # Change to project root directory
        project_root = Path(__file__).parent.parent.parent
        os.chdir(project_root)
        
        result = subprocess.run([sys.executable, 'run_all_agents.py'], 
                                check=True, 
                                stdout=subprocess.PIPE, 
                                stderr=subprocess.PIPE, 
                                text=True)
        
        print("✓ ECE agents started successfully!")
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Error starting ECE agents: {e}")
        print(f"stdout: {e.stdout}")
        print(f"stderr: {e.stderr}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Start ECE ecosystem (Redis, Neo4j, and agents) with on-demand model management')
    parser.add_argument('--skip-docker', action='store_true', 
                       help='Skip starting Docker services (Redis and Neo4j)')
    parser.add_argument('--skip-model-config', action='store_true',
                       help='Skip model configuration update for on-demand management')
    
    args = parser.parse_args()
    
    # Change to utility_scripts directory
    utility_scripts_dir = Path(__file__).parent.parent
    os.chdir(utility_scripts_dir)
    
    print("External Context Engine (ECE) Ecosystem Starter")
    print("=" * 50)
    
    if not args.skip_docker:
        if not start_docker_services():
            print("Failed to start Docker services. Exiting.")
            return 1
    
    if not args.skip_model_config:
        print("\nUpdating configuration for on-demand model management...")
        
        if not detect_and_update_model_config():
            print("Failed to update configuration for on-demand model management. Continuing anyway...")
            # We don't exit here because the user might want to start the agents anyway
    
    print("\nWaiting 10 seconds for services to initialize...")
    time.sleep(10)
    
    if not start_ece_agents():
        print("Failed to start ECE agents. Exiting.")
        return 1
    
    print("\nECE ecosystem is running!")
    print("- Redis: localhost:6379")
    print("- Neo4j: localhost:7687")
    print("- ECE Orchestrator: localhost:8000")
    print("- Other agents on ports 8001-8007")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())