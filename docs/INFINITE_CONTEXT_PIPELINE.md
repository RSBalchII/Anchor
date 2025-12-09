# Infinite Context Pipeline Documentation

## Overview
The Context-Engine implements an infinite context pipeline that allows for unlimited conversation lengths by intelligently managing context rotation, historical memory, and graph-based reasoning. This system prevents context window limitations by rotating old context into compressed summaries while maintaining access to historical information.

## Architecture

### 1. Hardware Foundation Layer
- All LLM servers boot with 65,536 token context windows
- Flash Attention enabled when available
- Quantized KV cache (Q8_0) for memory efficiency
- Full GPU offload for optimal performance

### 2. Context Rotation Protocol
- `ContextManager` monitors total context length
- Automatic rotation when context approaches 55k tokens
- `Distiller` creates "Narrative Gist" summaries of old context
- Neo4j stores `ContextGist` nodes with chronological links

### 3. Graph-R1 Reasoning Enhancement
- `GraphReasoner` retrieves `ContextGist` memories for historical context
- Maintains reasoning flow across context rotations
- Enhanced retrieval logic with temporal awareness

### 4. Model-Specific Chat Template Integration
- Fixed LLM Client to properly detect model types and use correct API endpoints
- Added Template Detection: Scripts auto-detect Gemma, Qwen, Llama models and apply correct chat templates
- Prevented Role Alternation Errors: Fixed the "Conversation roles must alternate" issue with Gemma models

## Configuration

### LLM Server Startup
All `start_llm_*.py` scripts are configured with:
- 65,536 token context window
- Proper chat template configuration
- KV cache optimization
- GPU offloading settings

### Plugin Management
- Tools are disabled by default to avoid redundancy with Qwen Code CLI
- Can be enabled with `PLUGINS_ENABLED=1` when needed
- Prevents token redundancy between backend tools and CLI tools

## Key Features

### 1. Context Management
- Automatic context rotation when thresholds are reached
- Preservation of important context through distillation
- Hierarchical storage in Redis (short-term) and Neo4j (long-term)

### 2. Memory System
- Three-tier memory: Active (Redis), Relevant (Neo4j), Summaries (Neo4j)
- Archivist agent for memory management
- ContextGist system for historical preservation

### 3. Graph Reasoning
- GraphR1 agent for reasoning across context rotations
- Temporal linking of memory nodes
- Enhanced retrieval with historical context

## Troubleshooting

### Common Issues

#### Role Alternation Errors
**Issue**: `Conversation roles must alternate user/assistant/user/assistant/...`
**Cause**: Improperly formatted conversation history sent to the LLM
**Solution**: Proper message structure with alternating user/assistant roles

#### Template Parsing Issues
**Issue**: `.->.->.->` pattern errors
**Cause**: Template processing conflicts between CLI and backend
**Solution**: Proper separation of concerns and template configuration

#### Context Overflow
**Issue**: Context window limitations
**Solution**: Automatic context rotation and distillation

## Usage

The system works seamlessly with Qwen Code CLI, providing infinite context capabilities without interfering with the CLI's own functionality. The context rotation happens transparently in the background, ensuring conversations can continue indefinitely while maintaining access to historical context.

## Security and Safety

- Tools are disabled by default to prevent redundancy
- Context is properly isolated and managed
- Memory validation and sanitization
- Protection against malformed inputs