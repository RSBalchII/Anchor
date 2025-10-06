<<<<<<< HEAD
# External Context Engine (ECE) - Complete Project Overview

## Project Overview

The External Context Engine (ECE) is a sophisticated cognitive architecture designed to provide persistent memory and intelligent context management for AI systems. The system integrates multiple AI agents with a Neo4j knowledge graph and reinforcement learning components to create an intelligent context manager that enables AI systems to think over time. The ECE is built with Python using FastAPI framework and follows a three-tier agent architecture with UTCP (Universal Tool Calling Protocol) integration.

## Architecture Overview

The ECE follows a three-tier architecture with specialized agents at each level:

### Tier 1: Orchestrator
- **Orchestrator Agent**: The central coordinator that routes prompts to appropriate agents and manages the overall flow using a decision tree for transparent reasoning. It provides a FastAPI-based REST interface for client interactions.

### Tier 2: Thinkers
- **Thinker Agents**: Specialized reasoning agents that provide different perspectives (Optimist, Pessimist, Creative, Analytical, Pragmatic)
- **Synthesis Agent**: Combines multiple perspectives into a coherent analysis

### Tier 3: Memory Cortex
=======
# External Context Engine (ECE) - Memory Management System

## 📋 Project Overview

The External Context Engine (ECE) is a sophisticated cognitive architecture designed to provide persistent memory and context management for AI systems. This repository contains the implementation of Phase 3 of the ECE, which focuses on creating an intelligent memory management system with Q-Learning powered context retrieval. Version 3.4 enhances the architecture with Universal Tool Calling Protocol (UTCP) integration, replacing bespoke wrapper APIs with standardized tool definitions that can be discovered and called through a central UTCP Tool Registry.

### Architecture

The ECE follows a three-tier architecture:

#### Tier 1: Orchestrator
- **Orchestrator Agent**: The central coordinator that routes prompts to appropriate agents and manages the overall flow using a decision tree for transparent reasoning.

#### Tier 2: Thinkers
- **Thinker Agents**: Specialized reasoning agents that provide different perspectives (Optimist, Pessimist, Creative, Analytical, Pragmatic)
- **Synthesis Agent**: Combines multiple perspectives into a coherent analysis

#### Tier 3: Memory Cortex
>>>>>>> 8bb7675114549940f808f7d6ac277471255febc5
- **Archivist Agent**: Master controller of the memory cortex that manages knowledge graph operations
- **QLearning Agent**: Reinforcement learning agent for optimal path finding in the knowledge graph
- **Distiller Agent**: Processes raw text to extract structured information for storage
- **Injector Agent**: Persists structured data to the Neo4j knowledge graph

<<<<<<< HEAD
## Key Components

### Q-Learning Agent
The QLearningAgent uses reinforcement learning to navigate and optimize the Neo4j knowledge graph. It maintains a Q-table representing learned pathways and relationships within the graph, with features:
- Neo4j integration for graph traversal
- Q-learning algorithm implementation with configurable parameters
- State and action space based on graph nodes and relationships
- Reward system for contextual information retrieval

### UTCP (Universal Tool Calling Protocol)
- **UTCP Tool Registry**: Central service for tool discovery and registration
- **UTCP Client**: Standardized client library for discovering and calling tools
- Standardized tool definitions that replace bespoke wrapper APIs
- Centralized tool discovery across all ECE capabilities

### Context Management
- **Redis-based Context Cache**: For high-performance short-term context storage
- **Neo4j Knowledge Graph**: For structured long-term memory storage
- Context preservation and coherence across interactions
- Cohesion Loop for maintaining short-term continuity

### LLM Integration
- Integration with Ollama for local LLM inference
- Configurable LLM providers and models
- Schema-guided reasoning with decision trees

## Building and Running

### Prerequisites
- Python 3.12+
- Docker and Docker Compose
- NVIDIA GPU with CUDA 12.1 support (recommended)
- Neo4j database
- Redis server
=======
### Core Components
- **UTCP Tool Registry**: Central service for tool discovery and registration, providing standardized access to all ECE capabilities
- **UTCP Client**: Standardized client library for discovering and calling tools via the registry
- **Context Cache**: Redis-based cache for high-performance context storage
- **Knowledge Graph**: Neo4j database for structured memory storage
- **LLM Integration**: Ollama for local LLM inference

## 🚀 Building and Running

### Prerequisites
- Docker and Docker Compose
- NVIDIA GPU with CUDA 12.1 support (RTX 4090 recommended)
- 64GB RAM minimum (32GB for cache pool)
- Python 3.11+
>>>>>>> 8bb7675114549940f808f7d6ac277471255febc5

### Installation
```bash
# Clone the repository
git clone https://github.com/chimaera-multi-modal-agent/External-Context-Engine-ECE.git
cd External-Context-Engine-ECE

<<<<<<< HEAD
# Navigate to the main project directory
cd External-Context-Engine-ECE  # There's a nested directory with the same name

=======
>>>>>>> 8bb7675114549940f808f7d6ac277471255febc5
# Configure environment
cp .env.example .env
# Edit .env with your settings

<<<<<<< HEAD
# Install Python dependencies
pip install -r requirements.txt

# Or use uv for faster installation
uv pip install -r requirements.txt
```

### Running the Application
```bash
# Start services with Docker Compose
docker-compose up -d

# Run the orchestrator service directly
python app.py

# Or run with uvicorn for development
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Using the ECE Client
```bash
# Run the interactive ECE client
python ece_client.py
```

### API Endpoints
- `GET /`: Health check for Orchestrator
- `GET /health`: Detailed health status
- `GET /v1/models`: Placeholder endpoint to mimic Ollama models endpoint
- `GET /process_prompt`: Process a user prompt using the Orchestrator
- `GET /get_analysis_result`: Retrieve the result of a complex reasoning analysis

## Project Structure
=======
# Start services
docker-compose up -d

# Initialize database
docker-compose exec chimaera-dev python scripts/init_db.py

# Verify health
curl http://localhost:8000/health
```

### Usage
```bash
# Send a context-aware prompt
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What did we discuss about memory management?"}'

# Store new context
curl -X POST http://localhost:8000/memory/store \
  -H "Content-Type: application/json" \
  -d '{"raw_text": "Memory management is crucial for AI systems with large context windows."}'

# Query memory
curl -X POST http://localhost:8000/memory/query \
  -H "Content-Type: application/json" \
  -d '{"query": "memory management", "max_tokens": 1000000}'
```

## 🧠 Key Features

### Intelligent Memory Management
- **Archivist Agent**: Central coordinator for knowledge graph operations
- **QLearning Agent**: Reinforcement learning for optimal path finding
- **Context Cache**: Redis-based caching with 32GB allocation
- **Token-Aware Summarization**: Processes up to 1M tokens of context

### Enhanced Context Retrieval
- **Keyword-Based Querying**: Extracts keywords for targeted memory retrieval
- **Semantic Search**: Vector similarity search using Sentence Transformers
- **Path Finding**: Q-Learning optimized traversal of knowledge graph
- **Context Summarization**: Token-aware summarization within LLM limits

### UTCP Integration
- **Universal Tool Discovery**: Dynamic discovery of available tools across agents
- **Standardized Tool Definitions**: Consistent interface for all ECE capabilities
- **Centralized Registry**: Single source of truth for tool availability
- **Tool Categories**: Organized classification of tools (data_processing, retrieval, analysis)

### GPU Acceleration
- **CUDA Support**: Full PyTorch CUDA integration for RTX 4090
- **Batch Processing**: Efficient batch operations for large contexts
- **Mixed Precision**: GPU memory optimization with FP16 support
- **Embedding Generation**: Accelerated embedding computation

### Production Ready
- **Docker Containerization**: Full Docker support with Compose
- **Health Monitoring**: Built-in health checks and metrics
- **Error Handling**: Comprehensive error handling and logging
- **Scalable Architecture**: Designed for high-performance deployment

## 📁 Project Structure
>>>>>>> 8bb7675114549940f808f7d6ac277471255febc5

```
External-Context-Engine-ECE/
├── app.py                          # Main FastAPI application for Orchestrator
├── config.yaml                     # Main system configuration
├── docker-compose.yml              # Docker Compose configuration
<<<<<<< HEAD
├── Dockerfile                     # Docker image definition
├── ece_client.py                  # Headless ECE client
├── requirements.txt               # Python dependencies
├── .env                          # Environment variables
├── ece/                          # Main ECE source code
│   ├── agents/                   # Agent implementations
│   │   ├── tier1/                # Orchestrator agents
│   │   │   └── orchestrator/    # Main Orchestrator implementation
│   │   ├── tier2/               # Thinker agents
│   │   └── tier3/               # Memory cortex agents
│   │       ├── archivist/       # Archivist agent
│   │       ├── distiller/       # Distiller agent
│   │       ├── injector/        # Injector agent
│   │       └── qlearning/       # QLearning agent
│   ├── components/               # Core components
│   │   └── context_cache/       # Redis-based context cache
│   └── common/                  # Shared utilities
├── specs/                        # Specification documents
├── scripts/                      # Utility scripts
├── tests/                        # Test suite
├── utcp_client/                  # UTCP client library
├── utcp_registry/                # UTCP tool registry service
├── cli/                         # ECE Command-Line Interface
└── poml/                        # POML persona files
```

## Configuration

The system uses both `config.yaml` for main configuration and environment variables from `.env` for sensitive settings:

- `TAVILY_API_KEY`: API key for Tavily web search
- `OLLAMA_BASE_URL`: URL for Ollama LLM service
- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`: Neo4j database connection
- `REDIS_URL`: Redis cache connection URL
- `ECE_ORCHESTRATOR_URL`: URL for the orchestrator service

## Key Features

1. **Intelligent Memory Management**: Using Archivist Agent and QLearning Agent for optimal knowledge graph operations
2. **Multi-Agent Reasoning**: Specialized thinker agents providing different perspectives on queries
3. **UTCP Integration**: Standardized tool discovery and calling across all agents
4. **Context Coherence**: Short-term and long-term memory systems working together
5. **GPU Acceleration**: Optimized for CUDA-enabled GPUs for enhanced performance
6. **FastAPI Interface**: REST API for easy integration with other systems
7. **Rich CLI Client**: Interactive terminal interface with markdown support

## Development Conventions

- Follow Python PEP 8 coding standards
- Use Pydantic for configuration and data validation
- Implement rich terminal output for all user-facing content
- Follow clean architecture with separated concerns
- Use asynchronous programming for API calls to maintain responsiveness
- Write comprehensive tests for all functionality
- Use the Literate Commenting Protocol: every non-trivial line or logical block of code MUST be preceded by a comment explaining its purpose

## Dependencies

Key dependencies include:
- fastapi==0.116.1
- uvicorn==0.35.0
- python-dotenv==1.1.1
- neo4j==5.28.2
- redis (via Python redis library)
- httpx==0.28.1
- pydantic==2.11.7
- pydantic-settings==2.10.1
- rich==14.1.0
- numpy==2.3.2
- ollama==0.5.3
- docker==7.1.0
- sentence-transformers
- torch (for CUDA support)
- tavily-python (for web search capabilities)

## Testing

=======
├── Dockerfile                     # Main Docker image definition
├── requirements.txt                # Python dependencies
├── ece/                           # Main ECE source code
│   ├── agents/                    # Agent implementations
│   │   ├── tier1/                 # Orchestrator agents
│   │   │   └── orchestrator/     # Main Orchestrator implementation
│   │   ├── tier2/                # Thinker agents
│   │   └── tier3/                # Memory cortex agents
│   │       ├── archivist/        # Archivist agent
│   │       ├── distiller/        # Distiller agent
│   │       ├── injector/         # Injector agent
│   │       └── qlearning/        # QLearning agent
│   ├── components/                # Core components
│   │   └── context_cache/        # Redis-based context cache
│   └── common/                   # Shared utilities
├── specs/                         # Specification documents
├── scripts/                       # Utility scripts
├── tests/                         # Test suite
├── utcp_client/                   # UTCP client library
├── utcp_registry/                 # UTCP tool registry service
├── cli/                           # ECE Command-Line Interface
├── dockerfiles/                   # Docker build configurations
├── ece_client.py                 # Headless ECE client
└── poml/                          # POML persona files
```

## 🛠️ Dependencies

Key dependencies include:
- fastapi==0.104.1
- uvicorn==0.24.0
- python-dotenv==1.0.0
- neo4j==5.14.0
- redis>=5.0.1
- httpx==0.25.2
- tavily-python==0.3.3
- pydantic==2.5.0
- pydantic-settings==2.1.0
- numpy==1.24.3
- scikit-learn==1.3.2
- spacy==3.7.2
- torch==2.1.1
- sentence-transformers==2.2.2
- typer>=0.9.0
- rich>=13.0.0
- docker>=6.0.0

## 📊 API Endpoints

### Orchestrator Agent
- `GET /`: Health check for Orchestrator
- `GET /health`: Detailed health status
- `GET /v1/models`: Placeholder endpoint to mimic Ollama models endpoint
- `GET /process_prompt`: Process a user prompt using the Orchestrator
- `GET /get_analysis_result`: Retrieve the result of a complex reasoning analysis

### Archivist Agent
- `GET /`: Health check for Archivist
- `GET /health`: Detailed health status
- `POST /context`: External API endpoint to handle context requests
- `POST /internal/data_to_archive`: Internal endpoint to receive structured data from the Distiller
- `POST /internal/handle_truncated_entries`: Internal endpoint to handle truncated entries from the Context Cache
- `POST /memory_query`: Internal endpoint to handle memory queries from the Orchestrator for the Cohesion Loop
- `POST /enhanced_context`: Enhanced endpoint that coordinates with QLearning Agent to provide context-aware responses

### UTCP Registry Endpoints
- `GET /tools` - Get all available tools
- `GET /tools/{tool_id}` - Get specific tool definition
- `POST /tools` - Register a new tool
- `DELETE /tools/{tool_id}` - Remove a tool
- `GET /health` - Health check for the registry

### UTCP Client Interface
```python
class UTCPClient:
    def __init__(self, registry_url: str):
        """Initialize the UTCP client with the registry URL"""
        
    async def discover_tool(self, tool_id: str) -> ToolDefinition:
        """Discover a specific tool by ID"""
        
    async def discover_tools_by_agent(self, agent_name: str) -> List[ToolDefinition]:
        """Discover all tools provided by a specific agent"""
        
    async def discover_tools_by_category(self, category: str) -> List[ToolDefinition]:
        """Discover all tools in a specific category"""
        
    async def call_tool(self, tool_id: str, **kwargs) -> Any:
        """Call a tool by ID with the provided parameters"""
        
    async def list_all_tools(self) -> List[ToolDefinition]:
        """List all available tools in the registry"""
        
    async def register_tool(self, tool: ToolDefinition) -> bool:
        """Register a tool with the UTCP registry"""
```

## 🔄 Data Flows

### 1. Universal Context Retrieval Flow (Critical)
This is the foundational, non-negotiable data flow for ALL incoming prompts. It ensures every action is informed by long-term memory.

1. **Ingestion**: The Orchestrator receives the initial prompt from the client (ECE-CLI).
2. **Universal Routing**: The Orchestrator IMMEDIATELY routes the prompt (or its keywords) to the Archivist via UTCP `archivist.get_context` tool. This is a mandatory first step for ALL prompt types (analysis, conversational, memory query).
3. **Graph Query**: The Archivist queries the QLearningAgent using UTCP `qlearning.find_optimal_path` tool for relevant context from the Neo4j knowledge graph.
4. **Context Summarization**: The Archivist receives the context nodes from the QLearningAgent and summarizes them into a coherent context block, including specific examples (code, conversations). The size of this block must be configurable.
5. **Context Injection**: The Archivist returns the enriched, summarized context block to the Orchestrator.
6. **Enriched Execution**: The Orchestrator prepends the enriched context to the original prompt and ONLY THEN routes the new, combined payload to the appropriate agent (Synthesizer, ConversationalAgent, FileSystemAgent, WebSearchAgent, etc.) using UTCP tools for execution.

### 2. Tool Access Flow (Critical for Self-Development)
Defines how the ECE accesses local files and web resources to enable self-modification.

1. **Tool Detection**: The Orchestrator identifies when a prompt requires file or web access using UTCP tool discovery.
2. **Tool Routing**: The Orchestrator routes file/directory requests to FileSystemAgent or web requests to WebSearchAgent via UTCP tools.
3. **File Access**: The FileSystemAgent performs file operations (read, write, create, delete) while respecting security boundaries.
4. **Web Search**: The WebSearchAgent performs online queries using Tavily API for current information.
5. **Result Injection**: Tool results are injected back into the context before final response generation.
6. **Cache Update**: Tool access results are stored in the Redis cache for future reference.

### 3. Complex Reasoning & Output Flow (High Priority)
Defines the correct asynchronous process for handling complex reasoning tasks and delivering results.

1. **Initiation**: The Orchestrator starts the asynchronous reasoning task and returns an `analysis_id` to the client.
2. **Synthesis**: The Synthesizer agent processes the outputs from the Thinker agents into a final, complete analysis.
3. **Result Storage**: The Synthesizer sends the final analysis back to the Orchestrator.
4. **Cache Update**: The Orchestrator MUST store the final analysis in the Redis cache using the format "analysis:<analysis_id>" and update the task status to "complete".
5. **Client Retrieval**: The client can now successfully retrieve the completed analysis by polling the `/get_analysis_result` endpoint with the `analysis_id`.

### 4. Memory Preservation (Cache Truncation) Flow (Medium Priority)
The process for converting short-term memory (cache) into long-term memory (graph) before data is lost.

1. **Periodic Scan**: The Archivist will periodically perform a "tail read" on the Redis Context Cache (e.g., the oldest 1000 characters).
2. **Pre-emptive Archiving**: The Archivist sends this oldest block of context directly to the Injector agent using UTCP `injector.data_to_inject` tool.
3. **Graph Solidification**: The Injector receives the context, performs its de-duplication checks, and writes the information to the Neo4j knowledge graph.

### 5. Self-Development and Code Modification Flow (High Priority)
Enables the ECE to autonomously modify its own codebase based on requirements and feedback.

1. **Self-Modification Trigger**: The Orchestrator identifies when system code changes are needed.
2. **Code Analysis**: The ECE uses UTCP-discovered FileSystemAgent tools to read current implementation files.
3. **Context Integration**: The ECE combines current code context with specifications and requirements.
4. **Code Generation**: Thinker agents generate appropriate code modifications.
5. **Code Writing**: The ECE uses UTCP-discovered FileSystemAgent tools to write updated code.
6. **Verification**: The changes are verified against specifications and stored in the knowledge graph.

### 6. CLI Interaction Flow (Critical for User Experience)
Defines how the ECE-CLI provides the primary interface for user interaction with rich context management.

1. **Session Initialization**: ECE-CLI establishes a persistent session with context preservation across interactions.
2. **Command Processing**: CLI interprets user input and sends to Orchestrator with session context.
3. **Response Formatting**: Orchestrator responses are formatted with rich output (POML emotional lexicon, structured data).
4. **Context Persistence**: Conversation history is maintained across CLI sessions using the context cache.
5. **Multi-turn Interactions**: Complex conversations are supported with memory of previous exchanges.

### 7. Cohesion Loop (Line of Thought) Flow (Low Priority)
The process for the ECE's self-reflection, triggered by an empty prompt.

1. **Trigger**: The Orchestrator receives an empty prompt from the client.
2. **Cache Analysis**: The Orchestrator reads the current content of the Context Cache.
3. **Self-Reflection**: The Orchestrator generates a "thought" or a summary of its current internal state based on the cache contents.
4. **Append to Cache**: This generated "thought" is appended back into the Context Cache, creating a visible "line of thought." This output is NOT sent back to the user.

## 🛠️ Development Conventions

### Code Structure
- `/ece/agents/tier1/orchestrator/`: Orchestrator agent implementation
- `/ece/agents/tier2/`: Thinker agents
- `/ece/agents/tier3/`: Memory cortex agents (Archivist, QLearning, Distiller, Injector)
- `/ece/components/context_cache/`: Context caching system
- `/specs/`: Specification documents
- `/dockerfiles/`: Docker build configurations
- `/scripts/`: Utility scripts
- `/tests/`: Test suite

### Configuration
The system uses a `config.yaml` file for main configuration and environment variables from `.env` for sensitive settings.

### Testing
>>>>>>> 8bb7675114549940f808f7d6ac277471255febc5
```bash
# Run tests
pytest tests/

# Run unit tests
pytest tests/unit/

# Run integration tests
pytest tests/integration/

<<<<<<< HEAD
=======
# Run end-to-end tests
pytest tests/end_to_end/

>>>>>>> 8bb7675114549940f808f7d6ac277471255febc5
# Run with coverage
pytest --cov=src tests/
```

<<<<<<< HEAD
## Docker Support

The project includes full Docker support with:
- CUDA-enabled base image for GPU acceleration
- Docker Compose for service orchestration
- Volume mounts for development
- Neo4j and Redis services

## UTCP Tool Definition Schema

=======
### Code Quality
```bash
# Run linting
flake8 src/

# Run type checking
mypy src/

# Format code
black src/
```

## 📋 UTCP Tool Definition Schema
>>>>>>> 8bb7675114549940f808f7d6ac277471255febc5
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier for the tool in format agent.function_name"
    },
    "name": {
      "type": "string",
      "description": "Human-readable name of the tool"
    },
    "description": {
      "type": "string",
      "description": "Brief description of what the tool does"
    },
    "category": {
      "type": "string",
      "description": "Category of the tool (e.g., data_processing, retrieval, analysis)"
    },
    "parameters": {
      "type": "object",
      "description": "JSON Schema for the tool parameters"
    },
    "returns": {
      "type": "object",
      "description": "JSON Schema for the tool response"
    },
    "endpoint": {
      "type": "string",
      "description": "The service endpoint where the tool is available"
    },
    "version": {
      "type": "string",
      "description": "Version of the tool definition"
    },
    "agent": {
      "type": "string",
      "description": "The agent that provides this tool"
    }
  },
  "required": ["id", "name", "description", "parameters", "returns", "endpoint", "version", "agent"]
}
```

<<<<<<< HEAD
## Data Flows

### 1. Context Retrieval Flow
- Ingestion: Orchestrator receives prompt from client
- Universal Routing: Routes to Archivist via UTCP for context retrieval
- Graph Query: Archivist queries QLearningAgent for relevant context
- Context Summarization: Archivist summarizes relevant context
- Context Injection: Returns enriched context to Orchestrator
- Enriched Execution: Orchestrator routes to appropriate agent with context

### 2. Complex Reasoning Flow
- Initiation: Orchestrator starts async reasoning task
- Synthesis: Synthesizer processes outputs from Thinker agents
- Result Storage: Stores final analysis in Redis cache
- Client Retrieval: Client polls for completed analysis

### 3. Memory Preservation Flow
- Periodic Scan: Archivist performs "tail read" on Redis cache
- Pre-emptive Archiving: Sends oldest context to Injector agent
- Graph Solidification: Injector writes to Neo4j knowledge graph

## Performance Metrics

- Context Retrieval: < 2 seconds for graphs under 10K nodes
- Memory Storage: < 100ms for single concept insertion
- Path Finding: < 500ms with GPU acceleration
- Context Building: < 200ms for 4K token summaries
- Cache Hit Rate: > 80% with adequate allocation

## Command-Line Interface

The `ece_client.py` file provides a rich command-line interface with:
=======
## 📈 Performance Metrics

- **Context Retrieval**: < 2 seconds for graphs under 10K nodes
- **Memory Storage**: < 100ms for single concept insertion
- **Path Finding**: < 500ms with GPU acceleration
- **Context Building**: < 200ms for 4K token summaries
- **Cache Hit Rate**: > 80% with 32GB allocation

## 🔧 Configuration

### Environment Variables
The system relies on several environment variables:
- `TAVILY_API_KEY`: API key for Tavily web search
- `OLLAMA_BASE_URL`: URL for Ollama LLM service
- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`: Neo4j database connection
- `REDIS_URL`: Redis cache connection URL

### System Configuration (`config.yaml`)
Contains LLM settings, agent definitions, decision tree routing logic, and cache configuration.

## 🔒 Security

The system includes:
- Service-to-service authentication
- Environment-based secrets management
- Input validation via Pydantic models
- Docker-based network isolation

## 📊 Monitoring and Logging

- Structured JSON logging with correlation IDs
- Health check endpoints for all services
- Cache statistics tracking
- Async operation tracking with session IDs

## 🖥️ ECE Client

The `ece_client.py` file provides a rich command-line interface for interacting with the ECE:
>>>>>>> 8bb7675114549940f808f7d6ac277471255febc5
- Rich terminal experience with syntax highlighting and markdown support
- Persistent session management
- Built-in command history
- Robust error handling with user-friendly messages
<<<<<<< HEAD
- Asynchronous processing with status indicators
=======
- Asynchronous processing with status indicators

To run the client:
```bash
python ece_client.py
```
>>>>>>> 8bb7675114549940f808f7d6ac277471255febc5
