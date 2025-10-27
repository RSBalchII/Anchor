#!/usr/bin/env python3
"""
Test script for ECE Launcher functionality
"""

import sys
import os
import subprocess
import time
from pathlib import Path

def test_launcher_imports():
    """Test that the launcher can be imported without errors."""
    try:
        # Add project root to Python path
        project_root = Path(__file__).parent.parent
        sys.path.insert(0, str(project_root))
        
        # Try to import the launcher
        import ece_launcher
        print("[PASS] Launcher imported successfully")
        return True
    except Exception as e:
        print(f"[FAIL] Failed to import launcher: {e}")
        return False

def test_prerequisite_checks():
    """Test prerequisite checking functions."""
    try:
        # Add project root to Python path
        project_root = Path(__file__).parent.parent
        sys.path.insert(0, str(project_root))
        
        # Import launcher functions
        import ece_launcher
        
        # Test Docker check
        docker_available = ece_launcher.check_docker_installed()
        print(f"[PASS] Docker check completed (available: {docker_available})")
        
        # Test Docker Compose check
        compose_available = ece_launcher.check_docker_compose()
        print(f"[PASS] Docker Compose check completed (available: {compose_available})")
        
        return True
    except Exception as e:
        print(f"[FAIL] Failed prerequisite checks: {e}")
        return False

def test_logging_setup():
    """Test logging setup."""
    try:
        # Add project root to Python path
        project_root = Path(__file__).parent.parent
        sys.path.insert(0, str(project_root))
        
        # Import launcher logging function
        import ece_launcher
        
        # Test logging setup
        logger = ece_launcher.setup_logging()
        logger.info("[PASS] Logging setup test message")
        print("[PASS] Logging setup completed")
        
        return True
    except Exception as e:
        print(f"[FAIL] Failed logging setup: {e}")
        return False

def main():
    """Run all tests."""
    print("Testing ECE Launcher...")
    print("=" * 50)
    
    tests = [
        test_launcher_imports,
        test_prerequisite_checks,
        test_logging_setup
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"[FAIL] Test {test.__name__} failed with exception: {e}")
            failed += 1
        print()
    
    print("=" * 50)
    print(f"Tests completed: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("All tests passed!")
        return 0
    else:
        print("Some tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())