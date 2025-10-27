# External Context Engine (ECE) Project

## Project Overview

The External Context Engine (ECE) is a sophisticated cognitive architecture designed to provide persistent memory and context management for AI systems. It's an advanced agentic system that enables AI applications to maintain long-term relationships, recall past conversations, and build coherent narratives from fragmented knowledge. The system is designed to operate entirely on local hardware without cloud dependencies.

The ECE implements a multi-tier agent architecture with a focus on local-first execution, performance optimization using C++/Cython, and sophisticated reasoning capabilities through Markovian Thinking.

## Architecture Overview

The ECE uses a three-tier agent architecture:

- **Tier 1**: Orchestrator Agent - Central coordinator that routes prompts to appropriate agents
- **Tier 2**: Tool Agents - Specialized agents like WebSearchAgent and FileSystemAgent
- **Tier 3**: Memory Cortex - Core memory management agents including:
  - ArchivistAgent: Central coordinator for knowledge graph operations
  - QLearningAgent: Reinforcement learning for optimal path finding in the knowledge graph
  - DistillerAgent: Processes raw text to extract structured information
  - InjectorAgent: Optimizes the knowledge graph through reinforcement learning

### Core Technologies

- **LLM Integration**: Supports multiple providers (Ollama, llama.cpp, Docker Desktop)
- **Knowledge Graph**: Neo4j for persistent memory storage
- **Caching**: Redis-based context cache with 32GB allocation
- **Framework**: FastAPI for web services
- **Communication**: UTCP (Universal Tool Calling Protocol) for tool discovery and execution

### Key Features

#### Markovian Thinking Architecture
The ECE implements a sophisticated reasoning system called "Markovian Thinking":
- **Chunked Reasoning**: Processes information in fixed-size context windows
- **Dual-LLM PEVG Model**: Uses a Primary LLM (Generator) and TRM Service (Executor/Verifier)
- **Iterative Refinement**: Implements "propose -> critique -> refine" loops via specialized TRM service
- **Textual Carryover**: Maintains context between chunks with concise summaries

#### Intelligent Memory Management
- **Archivist Agent**: Central coordinator for knowledge graph operations
- **QLearning Agent**: Reinforcement learning for optimal path finding
- **Context Cache**: Redis-based caching
- **Token-Aware Summarization**: Processes large amounts of context

#### Enhanced Context Retrieval
- **Keyword-Based Querying**: Extracts keywords for targeted memory retrieval
- **Semantic Search**: Vector similarity search using Sentence Transformers
- **Path Finding**: Q-Learning optimized traversal of knowledge graph
- **Context Summarization**: Token-aware summarization within LLM limits

#### On-Demand Model Management
- **ModelManager**: Handles starting and stopping models on demand
- **Automatic Port Assignment**: Assigns available ports dynamically
- **Model Discovery**: Scans models directory to identify available GGUF models
- **Resource Optimization**: Starts models only when needed and stops them to save resources
- **Configuration Fixes**: Correctly handles model paths in config.yaml, fixing double `.gguf` extension issue and redundant path structure
- **API Base Management**: Properly manages API base URLs with appropriate port assignments for different models

#### Externalized Memory & Context Management
The ECE implements a multi-tiered context management system that preserves identity and memory external to any model:
1. **POML/JSON Persona**: Loaded first to establish identity and protocols
2. **Redis Context**: Conversation history and contextual information
3. **Current Prompt**: The immediate task or query
4. **Tool Outputs**: Additional information from web search, file operations, etc.

## Building and Running

### Prerequisites
- Python 3.11+
- Neo4j database
- Redis server
- CUDA-compatible GPU (for GPU acceleration)

### Setup
1. Install dependencies: `pip install -r requirements.txt`
2. Configure environment: Create `.env` file with Neo4j and Redis connection details
3. Configure LLM provider in `config.yaml`

### Running the System

#### Recommended: Using the Launcher Script
The ECE includes a launcher system to start all components:

```bash
# Navigate to the start directory
cd utility_scripts/start

# Start the entire ecosystem
python start_ecosystem.py
```

The launcher will:
- Start required Docker services (Neo4j, Redis) if not already running
- Configure the system for on-demand model management
- Start all ECE agents on their respective ports

#### Manual Starting
Alternatively, start agents individually:
```bash
# Start the main orchestrator and all agents
python run_all_agents.py
```

### Core Components

- **Orchestrator**: The central nervous system. Classifies intent and delegates tasks to other agents.
- **DistillerAgent**: Analyzes raw text to extract entities and relationships.
- **ArchivistAgent**: Persists structured data to the Neo4j knowledge graph.
- **QLearningAgent**: Intelligently traverses the knowledge graph to find optimal context paths.
- **InjectorAgent**: Optimizes the knowledge graph through reinforcement learning.
- **FileSystemAgent**: Provides tools for reading, writing, and listing files.
- **WebSearchAgent**: Provides tools for internet-based searches.

## Configuration

The ECE is configured through `config.yaml`:

```yaml
llm:
  active_provider: llama_cpp  # Can be ollama, docker_desktop, or llama_cpp
  providers:
    llama_cpp:
      model_path: "./models/your-model.gguf"
      api_base: "http://localhost:8080/v1"
```

## Development

### Environment Setup
```bash
# Create virtual environment
python -m venv .venv
# Activate the virtual environment
# On Windows: .venv\Scripts\activate
# On macOS/Linux: source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Running Tests
```bash
pytest tests/
```

### Key Components

#### Model Management
The ModelManager class handles on-demand model execution, including:
- Starting, stopping, and health checking of model servers
- Dynamic switching between different models
- Automatic port assignment for multiple model servers
- Model discovery to scan available models in the models/ directory

#### UTCP Implementation
The ECE fully implements the Universal Tool Calling Protocol (UTCP) 1.0+ specification using a decentralized architecture:
- Each service serves its own UTCP Manual at the standard `/utcp` endpoint
- No central registry service required
- Tools are discovered by fetching UTCP manuals directly from service endpoints
- Each tool is identified with a namespaced identifier (e.g., `filesystem.read_file`)

#### EnhancedOrchestratorAgent
The main processing component that:
- Implements `process_prompt_with_context_management` method that handles context overflow prevention
- Uses token counting with the `PromptManager` to ensure prompts stay within model limits
- Includes automatic fallback to Markovian thinking or direct model response based on prompt complexity
- Integrates with ArchivistClient for knowledge retrieval while managing context size
- Manages model lifecycle through the `ModelManager` class for on-demand execution

## Performance Optimization

The ECE uses a hybrid development model to achieve required performance:
- **Python**: Used for high-level orchestration and non-performance-critical logic
- **C++/Cython**: Performance-critical components identified through profiling are rewritten in C++
- **Profiling-Driven Development**: Regular performance profiling with cProfile and snakeviz to identify and address bottlenecks
- **GPU Acceleration**: CUDA support for accelerated embedding generation
- **On-Demand Model Execution**: Optimizes resource usage by starting models only when needed

## Context Loading Sequence

The ECE implements a specific context loading order to ensure consistent persona and memory across interactions:
1. **POML/JSON Persona**: Loaded first to establish identity and protocols
2. **Redis Context**: Conversation history and contextual information
3. **Current Prompt**: The immediate task or query
4. **Tool Outputs**: Additional information from web search, file operations, etc.

This architecture ensures that regardless of which model is selected via the dynamic model selection system, the persona defined in the POML files remains consistent and forms the foundational layer for all responses.

## API Endpoints

The orchestrator (port 8000) provides the following endpoints:
- `POST /process_prompt`: Process user prompts with context management
- `GET /v1/models`: List available models from the configured LLM provider
- `GET /models/available`: List models from the models directory
- `GET /models/current`: Get currently active model
- `POST /models/select`: Select and start a specific model
- `POST /models/start`: Start a specific model server
- `POST /models/stop`: Stop the currently running model server
- `GET /models/status`: Get status of model management system
- `GET /health`: Health check endpoint