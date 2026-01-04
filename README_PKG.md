# Packaging and Distribution (Gold Master)

This project is prepared for standalone distribution using `pkg`.

## Build Instructions

1. Navigate to the `engine` directory:
   ```bash
   cd engine
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the standalone executables:
   ```bash
   npm run build
   ```
   This will generate executables in `engine/dist/` for Windows, macOS, and Linux.

## Distribution Requirements

The executable is designed as a "Sidecar" and requires the following folder structure to function correctly:

```
/ (Distribution Root)
├── sovereign-context-engine.exe (or macos/linux binary)
├── cozo_node.node              (Native CozoDB binary - MUST BE IN SAME FOLDER AS EXE)
├── interface/                  (The web interface files)
├── context/                    (The data directory)
├── codebase/                   (The aggregated codebase directory)
├── backups/                    (Database snapshots)
└── logs/                       (Runtime logs)
```

### Native Modules (CRITICAL)
`pkg` cannot bundle native `.node` files. You MUST copy the correct native binary for your platform to the **SAME DIRECTORY** as the executable and rename it to `cozo_node.node`.

*   **Windows**: `cozo_node_prebuilt.node` (found in `engine/node_modules/cozo-node/native/6/`)
*   **macOS/Linux**: You may need to run `npm install cozo-node` on a machine of that OS to get the
 correct `.node` file.
### Running from `engine/dist` (Testing)
If you are running the executable directly from the `engine/dist` folder for testing:
1. Copy `cozo_node_prebuilt.node` into `engine/dist/` and rename it to `cozo_node.node`.
2. The engine is now smart enough to look two levels up for the `interface` and `context` folders.

## Cross-Platform Notes

### Apple (macOS) & Linux
1.  **Permissions**: After transferring the binary to a macOS or Linux system, you must grant it execution permissions:
    ```bash
    chmod +x sovereign-context-engine-macos
    ```
2.  **Gatekeeper (macOS)**: You may need to allow the app in "System Settings > Privacy & Security" since it is unsigned.
3.  **Case Sensitivity**: Linux is case-sensitive. Ensure all file references in your `context/` folder match the casing used in your queries. The engine uses `path.sep` to handle `/` vs `\` automatically.

## Portability
The engine uses `process.execPath` to determine its base directory when running as a packaged binary. This ensures it can find the `interface` and `context` folders regardless of where it is installed.
