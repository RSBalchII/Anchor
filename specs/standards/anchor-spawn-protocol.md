# Standard: Anchor Shell Spawn Protocol

**Authority:** Active Standard | **Trigger:** Native Shell Integration

## The Triangle of Pain

### 1. What Happened
The system needed a way to spawn native PowerShell terminals from the web dashboard that connect to the bridge API. Initial attempts failed due to missing endpoints and incorrect process spawning. Additionally, the Ghost engine (headless browser) had connection issues with the unified Anchor Core architecture due to hardcoded port references and incorrect model URL configurations.

### 2. The Cost
- 2 hours debugging process spawning on Windows
- 1 hour fixing endpoint registration issues
- 30 minutes updating UI to match new architecture
- 2 hours debugging WebSocket connection failures (hardcoded port 8080 vs 8000)
- 1.5 hours fixing model loading issues (multiple iterations with relative vs absolute paths)
- 1 hour understanding MLC engine model configuration requirements

### 3. The Rule
- **Endpoint Path:** Always use `/v1/system/spawn_shell` for native shell spawning
- **Authentication:** Must use `Bearer sovereign-secret` token
- **Process Spawning:** Use `subprocess.Popen()` with `shell=True` for Windows compatibility
- **UI Integration:** Dashboard must provide clear feedback on spawn success/failure
- **Port Consistency:** Use `http://localhost:8000` for unified architecture
- **WebSocket Connections:** Use `window.location.host` to dynamically connect to current port
- **API Calls:** Use relative paths (e.g., `/v1/gpu/status`) for same-server requests
- **Model Configuration:** Use local paths (e.g., `/models/model-name`) in model field, Hugging Face IDs in model_id field
- **Model Loading:** Local model checks should use relative paths like `/models/{id}/ndarray-cache.json`