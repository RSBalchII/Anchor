# Standard 011: Comprehensive Testing and Verification Protocol

**Status:** Active | **Category:** OPS | **Authority:** System-Enforced

## 1. What Happened
Features were implemented (e.g., Multi-Bucket Schema, Scribe State) but tests were not updated in parallel. This led to "Golden Path" search results that masked broken edge cases (like bucket-filtering bypasses) until manually discovered.

## 2. The Cost
- **Regressions**: New features broke older, unverified logic.
- **False Confidence**: Tests passed while core functionality (filtering) was actually failing.
- **Manual Toil**: Developers spent hours re-verifying what the suite should have caught.

## 3. The Rule: Synchronous Test-Code Binding
**ANY TIME any feature, API endpoint, or data setting is adjusted, the corresponding Test Suite (`engine/tests/suite.js`) MUST be updated in the same commit.**

### Specific Constraints:
1. **New Endpoints**: Any new route in `api.js` requires a dedicated test case in `suite.js`.
2. **Schema Changes**: If a CozoDB relation or bucket logic changes, the "Retrieval" section of the test suite must be updated to verify the new logic.
3. **Data Transformations**: If the ingestion pipeline (YAML formatting, hash calculation) changes, the "Ingestion" test must verify the new output.
4. **Zero-Fail Policy**: `npm test` must return "0 failed" before any code is considered "Completed".

## 4. Test Suite Structure (Node.js/ECE)
The ECE engine uses a unified JavaScript test runner [engine/tests/suite.js](engine/tests/suite.js):

- **Core Health**: Verifies connectivity and model availability.
- **Ingestion Pipeline**: Verifies content persistence and multi-bucket assignment.
- **Retrieval**: Verifies FTS accuracy, ID lookup, and strict bucket filtering.
- **Scribe**: Verifies Markovian state updates and clearance.

## 5. Execution Protocol
Before marking a task as [x] in `tasks.md`:
1. Start the engine: `cd engine ; node src/index.js`
2. Run tests: `cd engine ; npm test`
3. If failure > 0: Revert or Fix.

---
*Verified by Architecture Council.*