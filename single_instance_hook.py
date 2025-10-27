"""
Single instance hook to prevent multiple executions of ECE
This module implements a lock to ensure only one instance of ECE runs at a time.
"""

import os
import sys
import tempfile
import atexit

# Create a lock file to ensure only one instance runs
_lock_file = None

def _acquire_lock():
    """Acquires a lock to prevent multiple instances"""
    global _lock_file
    
    # Skip single instance check if we're a subprocess of the main ECE process
    if os.environ.get("ECE_AGENT_SUBPROCESS") == "1":
        return True

    # Platform-specific locking mechanism
    if os.name == 'nt':  # Windows
        try:
            lock_file_path = os.path.join(tempfile.gettempdir(), "ece_instance.lock")
            # Try to open the file in write mode exclusively (fails if already open)
            _lock_file = open(lock_file_path, "w")
            _lock_file.write(str(os.getpid()))
            _lock_file.flush()
            # Keep the file handle open to maintain the lock
            return True
        except (IOError, OSError):
            print("ECE is already running. Only one instance is allowed.")
            print("If this is incorrect, please delete the lock file and try again.")
            sys.exit(1)
    else:  # Unix-like systems
        try:
            import fcntl
            # Create lock file in temp directory
            lock_file_path = os.path.join(tempfile.gettempdir(), "ece_instance.lock")
            _lock_file = open(lock_file_path, "w")
            
            # Try to acquire exclusive lock
            fcntl.flock(_lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            
            # Write current process ID
            _lock_file.write(str(os.getpid()))
            _lock_file.flush()
            
            return True
        except (IOError, OSError, BlockingIOError, ImportError):
            print("ECE is already running. Only one instance is allowed.")
            print("If this is incorrect, please delete the lock file and try again.")
            sys.exit(1)

def _release_lock():
    """Releases the lock when shutting down"""
    global _lock_file
    
    if _lock_file:
        try:
            if os.name != 'nt':  # Unix-like systems
                import fcntl
                fcntl.flock(_lock_file.fileno(), fcntl.LOCK_UN)
            _lock_file.close()
        except:
            pass  # Best effort cleanup

# Acquire lock when module is imported
if not _acquire_lock():
    sys.exit(1)

# Cleanup on exit
atexit.register(_release_lock)