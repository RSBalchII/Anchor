Core tools for the Anchor system: Bridge, UI, and CLI components.

## Available Modes

### Standard Mode (Default)
- Automatically launches Ghost Engine (headless browser) for memory operations
- Runs all services in background with auto-resurrection

### Low Resource Mode
- Set `LOW_RESOURCE_MODE=true` before running to reduce memory/GPU usage
- Optimized for constrained devices

### CPU Only Mode
- Set `CPU_ONLY_MODE=true` before running to disable GPU acceleration
- Uses CPU for all operations

### No Resurrection Mode
- Set `NO_RESURRECTION_MODE=true` before running to disable auto-launching of Ghost Engine
- Allows manual control of Ghost Engine connection via browser
- Useful when you want to use an existing browser window or conserve resources