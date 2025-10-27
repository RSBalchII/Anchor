#!/usr/bin/env python3
"""
Script to update config.yaml with the specified model and port
"""
import subprocess
import yaml
import json
import os
import sys
import time
from pathlib import Path

def update_config_yaml(port, model_name):
    """Update config.yaml with the detected model information"""
    # More robust way to find the project root directory
    # Get the absolute path of the script directory and go up one level
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent
    config_path = project_root / 'config.yaml'
    
    # Also try to get the config file relative to the current working directory
    # as a fallback in case of execution environment issues
    cwd_config_path = Path('config.yaml').resolve()
    
    # Try the project root path first
    if config_path.exists():
        target_path = config_path
    elif cwd_config_path.exists():
        target_path = cwd_config_path
    else:
        print(f"Error: config.yaml not found at {config_path}")
        return False
    
    config_path = target_path
    
    try:
        # Read the existing config
        with open(config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        
        # Update the LLM configuration
        if 'llm' not in config:
            config['llm'] = {}
        
        config['llm']['active_provider'] = 'llama_cpp'
        
        if 'providers' not in config['llm']:
            config['llm']['providers'] = {}
        
        if 'llama_cpp' not in config['llm']['providers']:
            config['llm']['providers']['llama_cpp'] = {}
        
        # Update the llama.cpp provider configuration
        config['llm']['providers']['llama_cpp'].update({
            'model_path': f'../../models/{model_name}.gguf',
            'api_base': f'http://localhost:{port}/v1',
            'model': f'../../models/{model_name}.gguf'
        })
        
        # Update ThinkerAgent configuration if it exists
        if 'ThinkerAgent' in config:
            config['ThinkerAgent'].update({
                'model': f'../../models/{model_name}.gguf',
                'synthesis_model': f'../../models/{model_name}.gguf'
            })
        
        # Write the updated config back to file
        with open(config_path, 'w', encoding='utf-8') as f:
            yaml.dump(config, f, default_flow_style=False, sort_keys=False)
        
        print(f"Successfully updated config.yaml for model: {model_name} on port {port}")
        return True
        
    except Exception as e:
        print(f"Error updating config.yaml: {e}")
        return False

def main():
    if len(sys.argv) != 3:
        print("Usage: python update_config_for_running_model.py <port> <model_name>")
        return 1
    
    try:
        port = int(sys.argv[1])
        model_name = sys.argv[2]
    except ValueError:
        print("Invalid port number")
        return 1
    
    print(f"Updating configuration for model: {model_name} on port {port}")
    if update_config_yaml(port, model_name):
        print("Configuration updated successfully!")
        return 0
    else:
        print("Failed to update configuration.")
        return 1

if __name__ == '__main__':
    sys.exit(main())