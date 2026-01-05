# Standard 040: Cozo Syntax Compliance

**Status:** Active | **Category:** ARCH | **Authority:** LLM-Enforced

## 1. What Happened
Multiple system crashes and "Internal Server Errors" occurred due to invalid CozoDB query syntax, specifically regarding list operations (`unnest`, `is_in`, `length`).

## 2. The Cost
- **4 hours** debugging `parser::pest` and `eval::no_implementation` errors.
- **Engine Instability**: Premature shutdowns during hydration when batch queries failed.
- **UI Failure**: The bucket list failed to load because the `unnest` operation was not implemented in the current CozoDB version.

## 3. The Rule
1. **Avoid `unnest`**: Do not use `unnest()` for list flattening in CozoDB. Use JavaScript's `.flatMap()` on the result rows instead.
2. **List Filtering**: Prefer retrieving the full list and filtering in JavaScript rather than using complex `any(is_in(...))` queries which are prone to parser errors.
3. **Batch Safety**: Always wrap database operations in `try/catch` blocks and log the full error object to prevent the engine from exiting on a single query failure.
4. **Syntax Validation**: Test all new CozoDB queries via the `/v1/query` endpoint before hardcoding them into services.

---
*Verified by Architecture Council.*
