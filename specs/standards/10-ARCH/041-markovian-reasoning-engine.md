# Standard 041: Markovian Reasoning Engine

**Status:** Active | **Category:** ARCH | **Authority:** LLM-Enforced

## 1. What Happened
Long conversations caused context overflow and coherence loss. The model would "forget" earlier decisions mid-conversation, leading to contradictory responses and repeated questions.

## 2. The Cost
- **Context Overflow**: 14B models crashed when full conversation history exceeded 8K tokens.
- **Coherence Loss**: Users reported the model "forgetting" task context after 5-6 turns.
- **User Frustration**: Repeated re-explanation of project state.

## 3. The Rule

### Scribe Service (`engine/src/services/scribe.js`)
Implements "Rolling Context" via Markovian State compression:

1. **updateState(history)**: Takes last 10 conversation turns and compresses into a ~200 word "Session State" summary.
2. **getState()**: Retrieves current state from database (special ID: `session_state`).
3. **clearState()**: Resets session for fresh conversations.

### Context Weaving (`inference.js`)
Every `chat()` call automatically:
1. Retrieves Markovian State via `scribe.getState()`.
2. Prepends state to user message as `[SESSION STATE]...[/SESSION STATE]`.
3. Generates response with full context awareness.

### API Endpoints
```
POST /v1/scribe/update   - Update state from conversation history
GET  /v1/scribe/state    - Retrieve current session state
DELETE /v1/scribe/state  - Clear session state
GET  /v1/inference/status - Model status and configuration
```

### Token Budgeting Strategy
```
Priority Order (High → Low):
1. System Prompt (Fixed, ~50 tokens)
2. Markovian State (Rolling, ~200 tokens)
3. User Message (Variable)
4. RAG Context (Optional, budget-limited)
```

## 4. Operational Hygiene (The Polish Protocol)
To ensure system stability, every deployment must follow these safety constraints:
1. **Migration Safety**: Destructive schema migrations (`::remove`) must be preceded by an automated YAML export (`BACKUPS_DIR`).
2. **Synchronous Testing**: Feature/Data changes require parallel updates to `engine/tests/suite.js`.
3. **API Sanitization**: All ingress endpoints (`/v1/ingest`, `/v1/memory/search`) must reject empty or non-string inputs with `400 Bad Request`.
4. **Bucket Integrity**: Bucket filtering must be strictly enforced at the database level or via verified filter loops to prevent data-leakage across context boundaries.
5. **Verification**: 100% test pass rate in `engine/tests/suite.js` is required for production builds.

---
*Verified by Architecture Council.*
