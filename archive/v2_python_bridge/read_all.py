#!/usr/bin/env python3
"""
Root Reader: Aggregates content from relevant project files for orchestration.

This script scans the project directory and combines the content of source code,
configuration, and documentation files into a single text file (combined_text.txt).

It ignores files with more than 2000 lines, and skips common combined outputs and package manifest files.

It respects the current project structure:
- Root level scripts and docs
- tools/: Sovereign Core (JS/HTML/CSS)
- specs/: System Specifications
- scripts/: CI/Utility scripts

It also respects .gitignore files to determine which files should be excluded.

LIMIT: Content is limited to under 100k tokens for orchestrator model consumption.
"""

import argparse
import fnmatch
import json
import os
import re
from typing import Any, List, Tuple

import yaml


def find_project_root(start_path: str | None = None) -> str:
    """
    Locate project root by looking for indicators like .git, package.json, README.md
    """
    if start_path is None:
        start_path = os.path.abspath(__file__)

    path = os.path.abspath(start_path)
    if os.path.isfile(path):
        path = os.path.dirname(path)

    root_indicators = (".git", "package.json", "README.md")
    while True:
        if any(os.path.exists(os.path.join(path, ind)) for ind in root_indicators):
            return path
        parent = os.path.dirname(path)
        if parent == path:
            return os.getcwd()
        path = parent


def parse_gitignore(gitignore_path: str) -> List[str]:
    """
    Parse a .gitignore file and return a list of patterns.
    """
    patterns = []
    try:
        with open(gitignore_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                # Skip empty lines and comments
                if line and not line.startswith("#"):
                    patterns.append(line)
    except Exception:
        # If we can't read the file, return empty patterns
        pass
    return patterns


def is_ignored(
    file_path: str, gitignore_patterns: List[str], project_root: str
) -> bool:
    """
    Check if a file should be ignored based on .gitignore patterns.
    """
    rel_path = os.path.relpath(file_path, project_root).replace(os.sep, "/")

    for pattern in gitignore_patterns:
        # Handle negation patterns (starting with !)
        if pattern.startswith("!"):
            negated_pattern = pattern[1:]
            if fnmatch.fnmatch(rel_path, negated_pattern) or fnmatch.fnmatch(
                os.path.basename(rel_path), negated_pattern
            ):
                return False  # Don't ignore if it matches a negated pattern
        else:
            # Check if the pattern matches the file path
            if fnmatch.fnmatch(rel_path, pattern) or fnmatch.fnmatch(
                os.path.basename(rel_path), pattern
            ):
                # If pattern starts with /, it only matches from the gitignore's directory
                if pattern.startswith("/"):
                    # Check if the relative path from gitignore directory matches
                    gitignore_dir = os.path.dirname(
                        os.path.relpath(gitignore_path, project_root)
                    ).replace(os.sep, "/")
                    if gitignore_dir == ".":
                        gitignore_dir = ""
                    else:
                        gitignore_dir += "/"
                    if rel_path.startswith(gitignore_dir):
                        relative_to_gitignore = rel_path[len(gitignore_dir) :]
                        if fnmatch.fnmatch(
                            relative_to_gitignore, pattern[1:]
                        ) or fnmatch.fnmatch(
                            os.path.basename(relative_to_gitignore), pattern[1:]
                        ):
                            return True
                else:
                    # For non-absolute patterns, match against the full path
                    if fnmatch.fnmatch(rel_path, pattern) or fnmatch.fnmatch(
                        os.path.basename(rel_path), pattern
                    ):
                        return True
    return False


def count_tokens(text: str) -> int:
    """
    Count approximate tokens in text using a simple heuristic.
    This is a basic approximation - 1 token is roughly 4 characters or 1 word.
    """
    # Simple tokenization: split on whitespace and punctuation
    # This is a rough approximation; for more accuracy, we could use tiktoken or similar
    if not text:
        return 0

    # Split on whitespace and common punctuation
    tokens = re.findall(r"\b\w+\b|[^\w\s]", text)
    return len(tokens)


def file_has_too_many_lines(file_path: str, max_lines: int = 2000) -> bool:
    """
    Return True if file has more than max_lines lines.
    Counted efficiently by reading in binary and summing newline bytes.
    """
    try:
        with open(file_path, "rb") as f:
            lines = 0
            for chunk in iter(lambda: f.read(8192), b""):
                lines += chunk.count(b"\n")
                if lines > max_lines:
                    return True
    except Exception:
        # If we can't read the file, be conservative and skip it
        return True
    return False


def get_allowed_files(project_root: str) -> List[Tuple[str, str]]:
    """
    Returns list of (file_path, section_name) for all relevant project files.
    """
    allowed_files = []

    # Extensions we care about
    code_exts = {
        ".py",
        ".js",
        ".ts",
        ".html",
        ".css",
        ".json",
        ".md",
        ".bat",
        ".ps1",
        ".sh",
        ".yaml",
        ".yml",
    }

    # Directories to completely ignore
    ignored_dirs = {
        "context",
        ".git",
        ".venv",
        "browser_data",
        "archive",
        "__pycache__",
        "node_modules",
        ".github",
        "tests",
        "standards",
    }

    # Files to ignore (add common package manifests and combined outputs)
    ignored_files = {
        "package-lock.json",
        "package.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "combined_text.txt",
        "combined_text.json",
        "cozo_lib_wasm_bg.wasm",
        "combined_memory.json",
        "cozo_import_memory.json",
    }

    # Collect all .gitignore patterns from the project
    gitignore_patterns = []
    for root, dirs, files in os.walk(project_root):
        # Filter directories in-place to avoid walking into ignored ones
        dirs[:] = [d for d in dirs if d not in ignored_dirs and not d.startswith(".")]

        if ".gitignore" in files:
            gitignore_path = os.path.join(root, ".gitignore")
            patterns = parse_gitignore(gitignore_path)
            # Add directory context to relative patterns
            for pattern in patterns:
                gitignore_patterns.append((root, pattern))

    for root, dirs, files in os.walk(project_root):
        # Filter directories in-place to avoid walking into ignored ones
        dirs[:] = [d for d in dirs if d not in ignored_dirs and not d.startswith(".")]

        rel_root = os.path.relpath(root, project_root)
        section = "ROOT" if rel_root == "." else rel_root.replace(os.sep, "_").upper()

        for f in files:
            fname_lower = f.lower()
            # Skip explicitly ignored files and common combined outputs
            if (
                fname_lower in ignored_files
                or "combined_text" in fname_lower
                or "combined_memory" in fname_lower
            ):
                continue

            ext = os.path.splitext(f)[1].lower()
            if ext in code_exts:
                full_path = os.path.join(root, f)

                # Check if file should be ignored based on .gitignore patterns
                rel_path = os.path.relpath(full_path, project_root).replace(os.sep, "/")
                should_ignore = False

                for gitignore_dir, pattern in gitignore_patterns:
                    # Calculate relative path from the gitignore directory
                    rel_to_gitignore = os.path.relpath(
                        full_path, gitignore_dir
                    ).replace(os.sep, "/")

                    # Handle negation patterns (starting with !)
                    if pattern.startswith("!"):
                        negated_pattern = pattern[1:]
                        if fnmatch.fnmatch(
                            rel_to_gitignore, negated_pattern
                        ) or fnmatch.fnmatch(f, negated_pattern):
                            should_ignore = (
                                False  # Don't ignore if it matches a negated pattern
                            )
                    else:
                        # Check if the pattern matches the file path
                        if pattern.startswith("/"):
                            # Pattern is anchored to the directory containing the .gitignore
                            if fnmatch.fnmatch(
                                rel_to_gitignore, pattern[1:]
                            ) or fnmatch.fnmatch(f, pattern[1:]):
                                should_ignore = True
                        else:
                            # Pattern applies recursively
                            if fnmatch.fnmatch(
                                rel_to_gitignore, pattern
                            ) or fnmatch.fnmatch(f, pattern):
                                should_ignore = True

                if should_ignore:
                    print(f"Skipping '{rel_path}' — ignored by .gitignore")
                    continue

                # Skip files that are too large (more than 2000 lines)
                if file_has_too_many_lines(full_path, 2000):
                    print(
                        f"Skipping '{os.path.relpath(full_path, project_root)}' — exceeds 2000 lines."
                    )
                    continue
                allowed_files.append((full_path, section))

    return allowed_files


def to_yaml_style(obj: Any, indent: int = 0) -> str:
    """
    Recursively converts a JSON-compatible object to a YAML-like string.
    """
    lines = []
    prefix = "  " * indent

    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, (dict, list)):
                lines.append(f"{prefix}{k}:")
                lines.append(to_yaml_style(v, indent + 1))
            else:
                # Handle multiline strings safely
                v_str = str(v)
                if "\n" in v_str:
                    lines.append(f"{prefix}{k}: |")
                    for line in v_str.split("\n"):
                        lines.append(f"{prefix}  {line}")
                else:
                    lines.append(f"{prefix}{k}: {v}")
    elif isinstance(obj, list):
        for item in obj:
            if isinstance(item, (dict, list)):
                lines.append(f"{prefix}-")
                # For list items that are objects, we want the properties to align slightly differently
                # But for simplicity in this custom dumper:
                sub = to_yaml_style(item, indent + 1)
                lines.append(sub)
            else:
                lines.append(f"{prefix}- {item}")
    else:
        return f"{prefix}{obj}"

    return "\n".join(lines)


def create_project_corpus(
    output_file: str | None = None,
    dry_run: bool = False,
    max_tokens: int = 200000,  # Limit to under 200k tokens for orchestrator
):
    """
    Aggregates content from project files into a single corpus.
    Limits content to under max_tokens for orchestrator model consumption.
    Also creates a YAML version of the memory records for easier processing.
    """
    project_root = find_project_root()
    output_file = output_file or os.path.join(project_root, "combined_text.txt")
    yaml_output_file = (
        output_file.replace(".txt", ".yaml")
        if output_file.endswith(".txt")
        else os.path.join(project_root, "combined_memory.yaml")
    )

    print(f"Project Root Detected: {project_root}")
    allowed_files = get_allowed_files(project_root)

    if not allowed_files:
        print(f"No relevant files found in '{project_root}'.")
        return

    print(f"Found {len(allowed_files)} files to process.")

    if dry_run:
        print(f"Dry run enabled — would process {len(allowed_files)} files:")
        for file_path, section in allowed_files:
            print(f"  - {os.path.relpath(file_path, project_root)} ({section})")
        return

    memory_records = []
    total_tokens = 0

    with open(output_file, "w", encoding="utf-8") as outfile:
        # Add a file map at the very top for the orchestrator
        outfile.write("=== PROJECT FILE MAP ===\n")
        for file_path, section in allowed_files:
            rel_path = os.path.relpath(file_path, project_root)
            outfile.write(f"- {rel_path} ({section})\n")
        outfile.write("========================\n\n")

        # Write file map to token count
        file_map_content = "=== PROJECT FILE MAP ===\n"
        for file_path, section in allowed_files:
            rel_path = os.path.relpath(file_path, project_root)
            file_map_content += f"- {rel_path} ({section})\n"
        file_map_content += "========================\n\n"
        total_tokens += count_tokens(file_map_content)
        print(f"Token count after file map: {total_tokens}")

        for file_path, section in allowed_files:
            rel_path = os.path.relpath(file_path, project_root)

            # Check if we're approaching the token limit
            if total_tokens >= max_tokens:
                print(f"Token limit ({max_tokens}) reached. Stopping file processing.")
                break

            print(f"Processing '{rel_path}'...")
            try:
                with open(file_path, "rb") as raw_file:
                    raw_data = raw_file.read()
                if not raw_data:
                    continue

                try:
                    decoded_content = raw_data.decode("utf-8")
                except UnicodeDecodeError:
                    decoded_content = raw_data.decode("utf-8", errors="replace")

                ext = os.path.splitext(file_path)[1].lower()
                final_content = decoded_content

                # Upgrade: Convert JSON to YAML-like text
                if ext == ".json":
                    try:
                        json_obj = json.loads(decoded_content)
                        # Use pretty print json as a reliable fallback or strict yaml style
                        # The user asked for "YAML-like string (key: value) or pretty-printed JSON (indent=2)"
                        # Let's try our YAML converter first, it's cleaner for reading.
                        final_content = to_yaml_style(json_obj)
                    except Exception:
                        # Fallback to original content if parsing fails
                        pass

                # Check if adding this file would exceed the token limit
                file_start_marker = f"--- START OF FILE: {rel_path} ---\n"
                file_end_marker = f"--- END OF FILE: {rel_path} ---\n\n"

                # Calculate tokens for this file's content
                file_tokens = (
                    count_tokens(file_start_marker)
                    + count_tokens(final_content)
                    + count_tokens(file_end_marker)
                )

                if total_tokens + file_tokens > max_tokens:
                    print(
                        f"Skipping '{rel_path}' - would exceed token limit ({total_tokens + file_tokens} > {max_tokens})"
                    )
                    continue

                outfile.write(file_start_marker)
                outfile.write(final_content)
                if not final_content.endswith("\n"):
                    outfile.write("\n")
                outfile.write(file_end_marker)

                # Update token count
                total_tokens += file_tokens
                print(f"Tokens after '{rel_path}': {total_tokens}/{max_tokens}")

                # Store for JSON memory export (Node structure)
                memory_records.append(
                    {
                        "id": rel_path,
                        "timestamp": int(os.path.getmtime(file_path)),
                        "role": "file",
                        "content": final_content,
                        "source": rel_path,
                    }
                )

            except Exception as e:
                print(f"Error processing '{rel_path}': {e}")

    # Save the combined memory records for Builder ingestion
    memory_file = os.path.join(project_root, "combined_memory.json")
    with open(memory_file, "w", encoding="utf-8") as f:
        json.dump(memory_records, f, indent=2, ensure_ascii=False)
    print(f"Memory records saved to '{memory_file}'.")

    # Save the combined memory records as YAML for easier processing
    with open(yaml_output_file, "w", encoding="utf-8") as f:
        # Custom YAML representer for multiline strings
        def represent_str(dumper, data):
            if "\n" in data:
                return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|")
            return dumper.represent_scalar("tag:yaml.org,2002:str", data)

        yaml.add_representer(str, represent_str)
        yaml.dump(
            memory_records, f, default_flow_style=False, allow_unicode=True, indent=2
        )
    print(f"Memory records saved to '{yaml_output_file}' (YAML format).")

    print(f"\nAggregation complete. Corpus saved to '{output_file}'.")
    print(f"Total tokens in output: {total_tokens}")


def _parse_cli() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Aggregate project code and docs for orchestration."
    )
    p.add_argument(
        "--out",
        "-o",
        default=None,
        help="Output file path (defaults to combined_text.txt in project root)",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be processed without writing the combined file",
    )
    p.add_argument(
        "--max-tokens",
        "-t",
        type=int,
        default=100000,
        help="Maximum number of tokens to include in output (default: 100000)",
    )
    return p.parse_args()


if __name__ == "__main__":
    args = _parse_cli()
    create_project_corpus(
        output_file=args.out,
        dry_run=args.dry_run,
        max_tokens=args.max_tokens,
    )
