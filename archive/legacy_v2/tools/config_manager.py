"""
Configuration Manager for Anchor Core

This module provides a centralized configuration system that loads settings from config.json
and allows runtime modification. It serves as the basis for a future settings menu.
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional


class ConfigManager:
    """Centralized configuration manager for Anchor Core settings."""
    
    def __init__(self, config_path: str = "config.json"):
        self.config_path = Path(config_path)
        self.config = self._load_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from JSON file, with fallback to defaults."""
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"⚠️  Error loading config from {self.config_path}: {e}")
                print("Using default configuration...")
        
        # Default configuration
        return {
            "server": {
                "port": 8000,
                "host": "0.0.0.0",
                "cors_origins": ["*"]
            },
            "ghost_engine": {
                "auto_resurrection_enabled": True,
                "browser_executables": [
                    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
                    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
                    "msedge",
                    "chrome",
                    "google-chrome"
                ],
                "browser_flags": [
                    "--headless=new",
                    "--no-first-run",
                    "--no-default-browser-check",
                    "--disable-background-networking",
                    "--disable-extensions",
                    "--disable-background-timer-throttling",
                    "--disable-backgrounding-occluded-windows",
                    "--disable-renderer-backgrounding",
                    "--disable-ipc-flooding-protection",
                    "--disable-background-media-suspend",
                    "--remote-debugging-port=9222"
                ],
                "low_resource_flags": [
                    "--max-active-webgl-contexts=1",
                    "--max-webgl-contexts-per-group=1",
                    "--disable-gpu-memory-buffer-compositor-resources",
                    "--force-gpu-mem-available-mb=64",
                    "--force-low-power-gpu"
                ],
                "cpu_only_flags": [
                    "--disable-gpu",
                    "--disable-software-rasterizer",
                    "--disable-gpu-sandbox",
                    "--disable-features=VizDisplayCompositor"
                ]
            },
            "logging": {
                "max_lines": 1000,
                "log_directory": "../logs",
                "log_format": "[%Y-%m-%d %H:%M:%S] [%level] %message"
            },
            "memory": {
                "max_ingest_size": 1000000,
                "default_limit": 10,
                "max_chars": 10000
            },
            "gpu_management": {
                "enabled": True,
                "max_concurrent": 1,
                "queue_timeout": 60
            },
            "model_loading": {
                "timeout_seconds": 120,
                "default_model": "Qwen2.5-7B-Instruct-q4f16_1-MLC",
                "model_base_url": "http://localhost:8000/models"
            },
            "watchdog": {
                "enabled": True,
                "watch_directory": "../context",
                "allowed_extensions": [".md", ".txt", ".json", ".yaml", ".py", ".js", ".html", ".css", ".ts", ".tsx", ".jsx"],
                "debounce_time": 2.0
            }
        }
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get a configuration value using dot notation (e.g., 'server.port').
        
        Args:
            key: Configuration key in dot notation
            default: Default value if key is not found
            
        Returns:
            Configuration value or default
        """
        keys = key.split('.')
        value = self.config
        
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        
        return value
    
    def set(self, key: str, value: Any) -> None:
        """
        Set a configuration value using dot notation (e.g., 'server.port').
        
        Args:
            key: Configuration key in dot notation
            value: Value to set
        """
        keys = key.split('.')
        config_ref = self.config
        
        for k in keys[:-1]:
            if k not in config_ref or not isinstance(config_ref[k], dict):
                config_ref[k] = {}
            config_ref = config_ref[k]
        
        config_ref[keys[-1]] = value
    
    def save(self) -> bool:
        """Save current configuration to the config file."""
        try:
            # Create directory if it doesn't exist
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"❌ Error saving config to {self.config_path}: {e}")
            return False
    
    def update_from_env(self) -> None:
        """Update configuration based on environment variables."""
        # Server settings
        if os.environ.get("BRIDGE_PORT"):
            self.set("server.port", int(os.environ["BRIDGE_PORT"]))

        if os.environ.get("LOW_RESOURCE_MODE") == "true":
            self.set("ghost_engine.auto_resurrection_enabled", True)  # Still enabled but with different flags
            # Apply low resource flags
            current_flags = self.get("ghost_engine.browser_flags", [])
            low_resource_flags = self.get("ghost_engine.low_resource_flags", [])
            self.set("ghost_engine.browser_flags", current_flags + low_resource_flags)

        if os.environ.get("CPU_ONLY_MODE") == "true":
            self.set("ghost_engine.auto_resurrection_enabled", True)  # Still enabled but with different flags
            # Apply CPU-only flags
            current_flags = self.get("ghost_engine.browser_flags", [])
            cpu_only_flags = self.get("ghost_engine.cpu_only_flags", [])
            self.set("ghost_engine.browser_flags", current_flags + cpu_only_flags)

        if os.environ.get("NO_RESURRECTION_MODE") == "true":
            self.set("ghost_engine.auto_resurrection_enabled", False)

        # Update browser executable paths if needed
        if os.environ.get("BROWSER_PATH"):
            self.set("ghost_engine.browser_executables", [os.environ["BROWSER_PATH"]])

    def get_server_config(self) -> Dict[str, Any]:
        """Get server-specific configuration."""
        return self.get("server", {})
    
    def get_ghost_engine_config(self) -> Dict[str, Any]:
        """Get Ghost Engine-specific configuration."""
        return self.get("ghost_engine", {})
    
    def get_logging_config(self) -> Dict[str, Any]:
        """Get logging-specific configuration."""
        return self.get("logging", {})
    
    def get_memory_config(self) -> Dict[str, Any]:
        """Get memory-specific configuration."""
        return self.get("memory", {})
    
    def get_gpu_config(self) -> Dict[str, Any]:
        """Get GPU management configuration."""
        return self.get("gpu_management", {})
    
    def get_model_config(self) -> Dict[str, Any]:
        """Get model loading configuration."""
        return self.get("model_loading", {})
    
    def get_watchdog_config(self) -> Dict[str, Any]:
        """Get watchdog configuration."""
        return self.get("watchdog", {})


# Global configuration instance
config_manager = ConfigManager()


def get_config() -> ConfigManager:
    """Get the global configuration manager instance."""
    return config_manager