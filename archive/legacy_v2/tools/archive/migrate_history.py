#!/usr/bin/env python3
"""
Legacy Session Migration Tool

This script consolidates legacy JSON session files into a single YAML file
in the context directory and ingests them into the CozoDB via the Bridge API.

The tool follows the "Physical Mirror First" approach, ensuring the source
of truth is written to the context directory before ingestion.
"""

import json
import yaml
import glob
import re
import requests
import os
import sys
import datetime
from pathlib import Path


def setup_logging():
    """Setup logging to file in logs directory."""
    # Ensure logs directory exists
    logs_dir = Path(__file__).parent.parent / "logs"
    logs_dir.mkdir(exist_ok=True)

    # Create log file with timestamp
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = logs_dir / f"migration_{timestamp}.log"

    return log_file


def log_message(log_file, level, message):
    """Write a log message to the log file."""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] [{level}] {message}\n"

    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(log_entry)


def numeric_sort_key(filename):
    """Extract numeric part from filename for proper sorting (e.g., part_2 before part_10)."""
    match = re.search(r'part_(\d+)', filename)
    return int(match.group(1)) if match else 0


def squash_json_sessions(sessions_dir, log_file):
    """Glob and merge all JSON session files into one master list."""
    log_message(log_file, "INFO", f"Looking for session files in: {sessions_dir}")
    print(f"🔍 Looking for session files in: {sessions_dir}")

    # Find all session files
    json_pattern = os.path.join(sessions_dir, "sessions_part_*.json")
    session_files = glob.glob(json_pattern)

    # If no files found in the main directory, try the 'raws' subdirectory
    if not session_files:
        raws_dir = os.path.join(sessions_dir, "raws")
        if os.path.exists(raws_dir):
            json_pattern = os.path.join(raws_dir, "sessions_part_*.json")
            session_files = glob.glob(json_pattern)
            if session_files:
                log_message(log_file, "INFO", f"Found session files in subdirectory: {raws_dir}")
                print(f"✅ Found session files in subdirectory: {raws_dir}")
                sessions_dir = raws_dir

    if not session_files:
        log_message(log_file, "ERROR", f"No session files found matching pattern: {json_pattern}")
        print(f"⚠️  No session files found matching pattern: {json_pattern}")
        # Try alternative path based on the actual directory structure we saw
        alt_path = os.path.join(os.path.dirname(sessions_dir), "sessions", "raws")
        if os.path.exists(alt_path):
            json_pattern = os.path.join(alt_path, "sessions_part_*.json")
            session_files = glob.glob(json_pattern)
            if session_files:
                log_message(log_file, "INFO", f"Found session files in alternative path: {alt_path}")
                print(f"✅ Found session files in alternative path: {alt_path}")
                sessions_dir = alt_path

    if not session_files:
        log_message(log_file, "ERROR", f"No session files found in any expected location")
        print(f"⚠️  No session files found in any expected location")
        return []

    log_message(log_file, "INFO", f"Found {len(session_files)} session files")
    print(f"📦 Found {len(session_files)} session files")

    # Sort files numerically (part_1, part_2, ..., part_10, etc.)
    session_files.sort(key=lambda x: numeric_sort_key(os.path.basename(x)))

    all_sessions = []

    for file_path in session_files:
        log_message(log_file, "INFO", f"Processing: {os.path.basename(file_path)}")
        print(f"📄 Processing: {os.path.basename(file_path)}")
        try:
            # Try different encodings if utf-8 fails
            data = None
            encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']

            for encoding in encodings:
                try:
                    with open(file_path, 'r', encoding=encoding) as f:
                        content = f.read().strip()

                        # Handle potential multiple JSON objects in one file
                        # Try to parse as single JSON first
                        try:
                            data = json.loads(content)
                            break  # Success, exit the encoding loop
                        except json.JSONDecodeError:
                            # If single JSON fails, try to handle multiple JSON objects
                            # Sometimes files have multiple JSON objects concatenated
                            if content.startswith('{') or content.startswith('['):
                                # Try to parse as concatenated JSON objects
                                import re
                                # Look for multiple JSON objects in the content
                                # This is a simple approach - look for }{ pattern which often separates objects
                                if '}{\n' in content or '}{\r\n' in content or '}{' in content:
                                    # Split on }{ and reconstruct
                                    parts = re.split(r'\}\s*\{', content)
                                    reconstructed_parts = []
                                    for i, part in enumerate(parts):
                                        # Add back braces appropriately
                                        if i == 0:
                                            # First part should start with { and might end with }
                                            if not part.startswith('{'):
                                                part = '{' + part
                                            if not part.endswith('}') and i < len(parts) - 1:
                                                part = part + '}'
                                        elif i == len(parts) - 1:
                                            # Last part should end with } and might start with {
                                            if not part.endswith('}'):
                                                part = part + '}'
                                            if not part.startswith('{') and i > 0:
                                                part = '{' + part
                                        else:
                                            # Middle parts need both braces
                                            if not part.startswith('{'):
                                                part = '{' + part
                                            if not part.endswith('}'):
                                                part = part + '}'

                                        try:
                                            reconstructed_parts.append(json.loads(part))
                                        except json.JSONDecodeError:
                                            continue  # Skip invalid parts

                                    if reconstructed_parts:
                                        data = reconstructed_parts
                                        break
                except UnicodeDecodeError:
                    continue  # Try next encoding

            if data is None:
                log_message(log_file, "ERROR", f"Could not decode file {file_path} with any encoding")
                print(f"⚠️  Could not decode file {file_path} with any encoding")
                continue

            # Handle both list and object formats
            if isinstance(data, list):
                all_sessions.extend(data)
            elif isinstance(data, dict):
                # If it's a single session object, wrap it in a list
                all_sessions.append(data)
            else:
                log_message(log_file, "WARNING", f"Unexpected data format in {file_path}, skipping...")
                print(f"⚠️  Unexpected data format in {file_path}, skipping...")
        except json.JSONDecodeError as e:
            log_message(log_file, "ERROR", f"JSON decode error in {file_path}: {e}")
            print(f"⚠️  JSON decode error in {file_path}: {e}")
        except Exception as e:
            log_message(log_file, "ERROR", f"Error reading {file_path}: {e}")
            print(f"⚠️  Error reading {file_path}: {e}")

    log_message(log_file, "SUCCESS", f"Merged {len(all_sessions)} total sessions")
    print(f"✅ Merged {len(all_sessions)} total sessions")
    return all_sessions


def save_as_yaml(data, output_path, log_file):
    """Save data to YAML file with proper formatting."""
    log_message(log_file, "INFO", f"Saving to YAML: {output_path}")
    print(f"📝 Saving to YAML: {output_path}")

    # Custom YAML representer for multiline strings
    def represent_str(dumper, data):
        if '\n' in data:
            return dumper.represent_scalar('tag:yaml.org,2002:str', data, style='|')
        return dumper.represent_scalar('tag:yaml.org,2002:str', data)

    yaml.add_representer(str, represent_str)

    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            yaml.dump(data, f, default_flow_style=False, allow_unicode=True, indent=2)
        log_message(log_file, "SUCCESS", "YAML file created successfully")
        print(f"✅ YAML file created successfully")
        return True
    except Exception as e:
        log_message(log_file, "ERROR", f"Error saving YAML file: {e}")
        print(f"❌ Error saving YAML file: {e}")
        return False


def ingest_via_bridge(yaml_content, filename, bridge_url, log_file):
    """Send the YAML content to the Bridge API for ingestion."""
    log_message(log_file, "INFO", f"Ingesting via Bridge API: {bridge_url}")
    print(f"🚀 Ingesting via Bridge API: {bridge_url}")

    payload = {
        "source": f"migration://{filename}",
        "content": yaml_content,
        "file_type": ".yaml",
        "filename": filename
    }

    try:
        response = requests.post(bridge_url, json=payload, timeout=30)

        if response.status_code == 200:
            log_message(log_file, "SUCCESS", f"Successfully ingested {filename} via Bridge API")
            print(f"✅ Successfully ingested {filename} via Bridge API")
            return True
        else:
            error_msg = f"Bridge API returned status {response.status_code}: {response.text}"
            log_message(log_file, "ERROR", error_msg)
            print(f"❌ {error_msg}")
            return False
    except requests.exceptions.ConnectionError:
        error_msg = f"Connection error: Could not reach Bridge API at {bridge_url}"
        log_message(log_file, "ERROR", error_msg)
        print(f"❌ {error_msg}")
        print("💡 Make sure to run 'start-anchor.bat' before executing this script")
        return False
    except requests.exceptions.Timeout:
        error_msg = f"Timeout error: Bridge API request timed out"
        log_message(log_file, "ERROR", error_msg)
        print(f"❌ {error_msg}")
        return False
    except Exception as e:
        error_msg = f"Error during API ingestion: {e}"
        log_message(log_file, "ERROR", error_msg)
        print(f"❌ {error_msg}")
        return False


def main():
    """Main migration function."""
    # Setup logging first
    log_file = setup_logging()

    log_message(log_file, "INFO", "Starting Legacy Session Migration Process...")
    print("🔄 Starting Legacy Session Migration Process...")

    # Configuration
    BRIDGE_URL = "http://localhost:8000/v1/memory/ingest"
    SESSIONS_DIR = "../context/Coding-Notes/Notebook/history/important-context/sessions/raws"
    OUTPUT_DIR = "../context"
    OUTPUT_FILE = "restored_history.yaml"

    # Convert to absolute paths relative to this script's location
    script_dir = Path(__file__).parent
    sessions_path = (script_dir / SESSIONS_DIR).resolve()
    output_path = (script_dir / OUTPUT_DIR / OUTPUT_FILE).resolve()

    config_msg = f"Configuration: Sessions Directory: {sessions_path}, Output File: {output_path}, Bridge URL: {BRIDGE_URL}"
    log_message(log_file, "INFO", config_msg)
    print(f"🔧 Configuration:")
    print(f"   Sessions Directory: {sessions_path}")
    print(f"   Output File: {output_path}")
    print(f"   Bridge URL: {BRIDGE_URL}")

    # Step A: Squash JSON files
    all_sessions = squash_json_sessions(sessions_path, log_file)

    if not all_sessions:
        error_msg = "No sessions found to migrate. Exiting."
        log_message(log_file, "ERROR", error_msg)
        print("❌ No sessions found to migrate. Exiting.")
        return

    # Step B: Convert & Mirror to YAML
    success = save_as_yaml(all_sessions, output_path, log_file)
    if not success:
        error_msg = "Failed to create YAML file. Exiting."
        log_message(log_file, "ERROR", error_msg)
        print("❌ Failed to create YAML file. Exiting.")
        return

    # Step C: Ingest via Bridge API
    try:
        with open(output_path, 'r', encoding='utf-8') as f:
            yaml_content = f.read()

        success = ingest_via_bridge(yaml_content, OUTPUT_FILE, BRIDGE_URL, log_file)
        if success:
            success_msg = f"Migration completed successfully! YAML file saved to: {output_path}, {len(all_sessions)} sessions ingested via Bridge API"
            log_message(log_file, "SUCCESS", success_msg)
            print(f"🎉 Migration completed successfully!")
            print(f"📄 YAML file saved to: {output_path}")
            print(f"📊 {len(all_sessions)} sessions ingested via Bridge API")
        else:
            warning_msg = f"Migration partially completed - YAML file created but ingestion failed. YAML file saved to: {output_path}"
            log_message(log_file, "WARNING", warning_msg)
            print("⚠️  Migration partially completed - YAML file created but ingestion failed")
            print(f"📄 YAML file saved to: {output_path} (can be manually ingested)")

    except FileNotFoundError:
        error_msg = f"Could not read the created YAML file: {output_path}"
        log_message(log_file, "ERROR", error_msg)
        print(f"❌ Could not read the created YAML file: {output_path}")
    except Exception as e:
        error_msg = f"Error during ingestion step: {e}"
        log_message(log_file, "ERROR", error_msg)
        print(f"❌ Error during ingestion step: {e}")

    print(f"📋 Log file created at: {log_file}")


if __name__ == "__main__":
    # Handle Windows console encoding
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding='utf-8')

    main()