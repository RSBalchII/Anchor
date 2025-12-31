# Standard: Model URL Construction and Availability Testing for MLC-LLM Integration

**Authority:** Active Standard | **Trigger:** Model Loading URL Construction Issues

## The Triangle of Pain

### 1. What Happened
The Anchor Console (`chat.html`) failed to load models with the error "TypeError: Failed to construct 'URL': Invalid URL", while the Root Mic (`anchor-mic.html`) loaded models successfully. The issue was in the dynamic model configuration where the system was constructing HuggingFace URLs instead of using the local path format expected by the MLC-LLM library. Additionally, model availability testing was needed to verify which models can be loaded before attempting to initialize the engine.

### 2. The Cost
- 3+ hours debugging model loading failures
- Confusion between working and failing components
- Inconsistent model loading across different UI components
- User frustration with non-functional chat interface
- Time wasted on attempting to load models that don't exist locally

### 3. The Rule
- **Full URL Format**: When configuring models for MLC-LLM, use full URL format with `window.location.origin`: `${window.location.origin}/models/{model-name}` instead of relative paths
- **Model ID Extraction**: Extract just the model name part from the full model ID using `selectedModelId.split('/').pop()`
- **Path Sanitization**: Sanitize model paths to remove special characters that could cause URL parsing errors: `path.replace(/[^a-zA-Z0-9._-]/g, '_')`
- **Consistent Format**: Ensure all dynamically added models follow the same URL pattern as pre-configured models in appConfig
- **Model Availability Testing**: Always verify model files exist locally before attempting engine initialization
- **URL Validation**: Always validate constructed URLs before passing to MLC-LLM engine

## Implementation Pattern

### Correct Format:
```javascript
// Predefined models in appConfig
const appConfig = {
    model_list: [
        {
            model: window.location.origin + "/models/Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC",  // Full URL format
            model_id: "mlc-ai/Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC",
            // ... other config
        }
    ]
};

// Dynamic model addition
const strippedModelId = selectedModelId.split('/').pop();
const safeModelPath = strippedModelId.replace(/[^a-zA-Z0-9._-]/g, '_'); // Sanitize path
appConfig.model_list.push({
    model: window.location.origin + `/models/${safeModelPath}`,  // Full URL format
    model_id: selectedModelId,                                   // Full HuggingFace ID
    model_lib: modelLib,                                        // WASM library URL
    // ... other config
});
```

### Model Availability Testing:
```javascript
// Test if model files exist before engine initialization
async function testModelAvailability(modelName) {
    const configFiles = [
        `/models/${modelName}/ndarray-cache.json`,
        `/models/${modelName}/tokenizer.json`,
        `/models/${modelName}/mlc-chat-config.json`
    ];

    for (const configFile of configFiles) {
        try {
            const response = await fetch(configFile, { method: 'HEAD' });
            if (response.status !== 200) {
                return { available: false, missingFile: configFile };
            }
        } catch (error) {
            return { available: false, error: error.message };
        }
    }
    return { available: true };
}
```

### Incorrect Format:
```javascript
// DO NOT USE - This causes "TypeError: Failed to construct 'URL'"
appConfig.model_list.push({
    model: `/models/${modelName}`,  // Relative path only
    // ...
});

// DO NOT USE - Without availability check
await CreateWebWorkerMLCEngine(worker, selectedModelId, { appConfig });
```

## File Renaming Standards

As part of this fix, the following files were renamed for consistency:
- `root-mic.html` → `anchor-mic.html` (Audio input interface)
- `root-dreamer.html` → `memory-builder.html` (Background processing)
- `sovereign-db-builder.html` → `db_builder.html` (Database management)

Update all references in HTML, documentation, and configuration files when renaming components.

## Model Availability Testing Protocol

Use the provided testing tools to verify model availability before attempting to load:

1. **Browser-based testing**: Use `tools/model_test.html` to test model accessibility via web interface
2. **Command-line testing**: Use `tools/test_model_loading.py` to test model availability programmatically
3. **Pre-loading verification**: Always check model availability before engine initialization
4. **Model download**: If model is not available locally, trigger download via `/v1/models/pull` endpoint

The testing tools verify:
- API endpoint accessibility
- Model path existence
- Required configuration files (ndarray-cache.json, tokenizer.json, mlc-chat-config.json)
- Overall system health