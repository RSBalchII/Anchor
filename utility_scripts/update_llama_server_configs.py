#!/usr/bin/env python3
"""
Script to update all model configuration files to reduce memory usage.
This script has been deprecated as the llama_server directory has been removed.
Models are now handled via on-demand ModelManager.
"""

def main():
    print("This script has been deprecated.")
    print("The llama_server directory has been removed as part of the transition to on-demand model management.")
    print("Models are now handled via the ModelManager which starts models when needed and stops them to save resources.")
    print("Configuration is automatically managed by the ModelManager.")

if __name__ == "__main__":
    main()