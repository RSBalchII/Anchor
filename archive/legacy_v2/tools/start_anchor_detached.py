#!/usr/bin/env python3
"""
Detached Start Script for Anchor System

This script starts the anchor system in a detached mode, following the documentation policy
that all scripts should run detached and log to the logs directory.
"""

import subprocess
import sys
import os
from pathlib import Path
import datetime


def run_detached():
    """Run the anchor system in detached mode with proper logging."""
    # Create logs directory if it doesn't exist
    logs_dir = Path("../logs")
    logs_dir.mkdir(exist_ok=True)
    
    # Create a log file for this script
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = logs_dir / f"start_anchor_{timestamp}.log"
    
    # Command to run the batch file
    cmd = ["cmd", "/c", "start-anchor.bat"]
    
    try:
        # Run the command and redirect output to log file
        with open(log_file, 'w') as f:
            subprocess.Popen(
                cmd,
                stdout=f,
                stderr=f,
                cwd=os.getcwd()
            )
        print(f"ANCHOR system started in detached mode. Log file: {log_file}")
    except Exception as e:
        print(f"Error starting anchor system: {e}")
        with open(log_file, 'a') as f:
            f.write(f"Error: {e}\n")


if __name__ == "__main__":
    run_detached()