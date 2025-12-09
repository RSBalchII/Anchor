# Context-Engine Specification

## Identity
- **Name**: Context-Engine
- **Role**: Executive Cognitive Enhancement (ECE) System
- **Philosophy**: Local-first, user-sovereign, agentic.

## Architecture Overview

The system follows a **Bridge-Core** architecture with three main components:

### 1. The Core (Brain) - backend/
- **Type**: Python FastAPI service
- **Logic**: Modular recipes (CodaChatRecipe for orchestration)
- **Memory**:
  - **Neo4j** (primary graph storage) - All memories, summaries, relationships
  - **Redis** (hot cache) - Active session management with 24h TTL
- **Agents**: Verifier (truth), Archivist (maintenance), Distiller (compression)
- **API**: FastAPI on port 8000

### 2. The Body (Interface) - anchor/
- **Type**: Terminal interface 
- **Communication**: HTTP/SSE to `localhost:8000`
- **State**: Local session persistence
- **Safety**: T-101 protocols with human confirmation flows

### 3. The Bridge (Browser Integration) - extension/
- **Type**: Chrome Extension (MV3)
- **Communication**: HTTP/SSE to `localhost:8000` 
- **State**: Local Storage (Persistence)
- **Capabilities**:
  - **Voice**: Streaming chat via Side Panel
  - **Sight**: Context injection (reading active tab)
  - **Memory**: **[Save to Memory]** button for Neo4j ingestion 
  - **Hands**: JavaScript execution (User-ratified)

## Infinite Context Pipeline Architecture

### Phase 1: Hardware Foundation
- **64k Context Window**: All LLM servers boot with 65,536 token capacity
- **GPU Optimization**: Full layer offload with Q8 quantized KV cache
- **Flash Attention**: Enabled for optimal performance with long contexts

### Phase 2: Context Rotation Protocol
- **Context Shifting**: Automatic rotation when context approaches 55k tokens
- **Intelligent Distillation**: Old context compressed to "Narrative Gists" using Distiller
- **Persistent Storage**: Gists stored in Neo4j as `:ContextGist` nodes with chronological links

### Phase 3: Graph-R1 Reasoning Enhancement
- **Gist Retrieval**: GraphReasoner searches `:ContextGist` nodes for historical context
- **Continuity Maintenance**: Maintains reasoning flow across context rotations
- **Smart Querying**: Enhanced retrieval with historical context awareness

## Memory Architecture (Current - Production)

### Neo4j Graph Database (port 7687) - PRIMARY
- **Purpose**: Permanent storage of memories, summaries, and relationships
- **Structure**: 
  - `(:Memory)` nodes with content, timestamp, importance, tags
  - `(:Summary)` nodes for distilled content
  - `[:RELATED_TO]`, `[:CAUSED_BY]`, `[:MENTIONS]` relationships for semantic connections
  - `[:NEXT_IN_SERIES]` relationships for chronological context gists
- **Features**: Full-text search, graph traversal, semantic queries

### Redis Cache (port 6379) - HOT CACHE  
- **Purpose**: Active session state and recent conversation cache
- **TTL**: 24-hour expiration for hot data
- **Content**: Recent exchanges, temporary context, session variables
- **Behavior**: Falls back to Neo4j when unavailable

## Cognitive Architecture: Agent System

### Verifier Agent
- **Role**: Truth-checking via Empirical Distrust
- **Method**: Provenance-aware scoring (primary sources > summaries)
- **Goal**: Reduce hallucinations, increase factual accuracy

### Distiller Agent  
- **Role**: Memory summarization and compression + Context Rotation
- **Method**: LLM-assisted distillation with salience scoring + context gist creation
- **Goal**: Maintain high-value context, prune noise, enable infinite context

### Archivist Agent
- **Role**: Knowledge base maintenance and freshness + Context Management
- **Method**: Scheduled verification, stale node detection, context rotation oversight
- **Goal**: Keep memory graph current and trustworthy, manage context windows

### Memory Weaver (Maintenance Engine)
- **Role**: Automated relationship repair
- **Method**: Embedding-based similarity with audit trail (`auto_commit_run_id`)
- **Goal**: Maintain graph integrity with full traceability

## Tool Integration Architecture

### UTCP (Simple Tool Mode) - Current
- **Discovery**: Plugin-based via `backend/plugins/` directory
- **Plugins**: 
  - `web_search` - DuckDuckGo search
  - `filesystem_read` - File and directory operations  
  - `shell_execute` - Shell command execution (with safety checks)
  - `mgrep` - Semantic code search
- **Execution**: Pattern-based for <14B models, structured for >14B models

### MCP Integration - Now Part of Main Server
- **Location**: Integrated into main ECE server when `mcp.enabled: true`
- **Endpoints**: `/mcp/tools`, `/mcp/call` on main port (8000)
- **Tools**:
  - `add_memory` - Add to Neo4j graph
  - `search_memories` - Graph search with relationships  
  - `get_summaries` - Session summary retrieval

## API Interface

### Core Endpoints (Port 8000)
- `POST /chat/stream` - Streaming conversation with full memory context
- `POST /archivist/ingest` - Ingest content to Neo4j memory graph
- `GET /health` - Server health check
- `GET /models` - Available models information
- `POST /mcp/call` - Memory tool operations (when MCP enabled)

### Security
- **API Keys**: Optional token authentication for all endpoints
- **Rate Limiting**: Request throttling to prevent abuse
- **Input Sanitization**: Validation for all user inputs

## Development & Deployment

### Requirements
- **Python**: 3.11+ 
- **Neo4j**: Graph database (local or remote)
- **Redis**: Cache server (recommended)
- **llama.cpp**: Server for local LLMs

### Startup Architecture
- **3-Script Model**:
  1. `python start_llm_server.py` - Interactive LLM with 64k context
  2. `python start_ece.py` - ECE Core with MCP and cognitive agents  
  3. `python start_embedding_server.py` - Optional embedding server

## Technology Stack

### Backend (Python)
- **Framework**: FastAPI
- **Database**: Neo4j (graph), Redis (cache)
- **Models**: llama.cpp server integration
- **Tools**: UTCP plugin system

### Frontend Components
- **Anchor**: Pure Python CLI with streaming
- **Extension**: Manifest V3 Chrome Extension with Side Panel UI

## Small Model Considerations

### Tool Usage
- ⚠️ Models < 14B: Use "Simple Tool Mode" (pattern-based execution)
- ✅ Models ≥ 14B: Full structured protocol support
- ✅ MCP Tools: Work with any model for memory operations

### Recommended Models
- **Gemma-3 4B** - Speed (chat only, tools unreliable)
- **Qwen3-8B** - Reasoning (Simple Tool Mode works)  
- **DeepSeek-R1-14B** - Tools (full structured protocol support)
- **Reka Flash 3 21B** - Reasoning (use start-reka.bat)

## Performance Optimization

### Context Windows
- **64k Context**: Full capacity for infinite work capability
- **Rotation Threshold**: 55k tokens triggers automatic context rotation
- **Gist Creation**: Old content compressed to maintain continuity

### Memory Management
- **Hot Cache**: Redis for active sessions (24h TTL)
- **Cold Storage**: Neo4j for permanent memories
- **Automatic Cleanup**: Scheduled pruning of expired sessions

---

## Research Foundation

- **Graph-R1**: Memory retrieval patterns (https://arxiv.org/abs/2507.21892)  
- **Markovian Reasoning**: Chunked thinking (https://arxiv.org/abs/2506.21734)
- **Hierarchical Reasoning Model (HRM)**: Multi-level context processing
- **Empirical Distrust**: Primary source supremacy for verification
- **Infinite Context Pipeline**: Hardware-software context rotation protocol