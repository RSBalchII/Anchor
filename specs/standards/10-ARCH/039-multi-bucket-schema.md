# Standard 039: Multi-Bucket Schema

**Status:** Active | **Category:** DATA | **Authority:** LLM-Enforced

## 1. What Happened
The original schema limited memories to a single `bucket` (String). This prevented complex categorization where a memory might belong to both `research` and `core`.

## 2. The Cost
- **2 hours** migrating existing data from `String` to `[String]`.
- **1 hour** fixing search queries that failed when encountering list types in CozoDB.
- **Systemic Friction**: Inability to perform multi-dimensional context retrieval.

## 3. The Rule
1. **Schema Definition**: The `memory` relation must define buckets as a list of strings: `buckets: [String]`.
2. **Default State**: All new memories must default to `['core']` if no buckets are provided.
3. **Ingestion**: The file watcher must map top-level directory names to the first element of the `buckets` list.
4. **Search**: Filtering by bucket should be performed in JavaScript after retrieval if the CozoDB list-intersection syntax becomes unstable.

---
*Verified by Data Integrity Unit.*
