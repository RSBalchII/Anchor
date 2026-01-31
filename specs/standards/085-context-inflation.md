
# Standard 085: Context Inflation & Dynamic Density

**Effective Date**: 2026-01-30
**Status**: Active
**Parent Standard**: [061-context-logic](./061-context-logic.md)
**Related Standard**: [065-graph-associative-retrieval](./065-graph-associative-retrieval.md)

## 1. Problem Statement: Atomic Disjointedness
The "Atomic Search" architecture (extracting small molecules) successfully retrieves precise hits but often lacks sufficient surrounding context for the LLM to understand the *narrative flow*. This results in "fragmented hallucination" where the LLM invents connections between disjointed atoms.

## 2. Solution: Context Inflation
"Context Inflation" is a post-search expansion layer that reconstructs the semantic neighborhood of a hit without retrieving the entire document.

### 2.1 The Algorithm
1.  **Grouping**: Search results (molecules) are grouped by their parent `compound_id`.
2.  **Sorting**: Molecules within a compound are sorted by `start_byte`.
3.  **Proximity Merging**:
    *   If `(MoleculeB.start - MoleculeA.end) < MERGE_THRESHOLD` (Default: **500 chars**), they are considered part of the same "Context Window".
    *   They are merged into a single window spanning from `MoleculeA.start` to `MoleculeB.end`.
4.  **Padding**:
    *   Apply `PADDING_CHARS` to the start and end of the window.
    *   Clamp to document boundaries (0, length).
5.  **Safety Capping**:
    *   **Constraint**: No single window may exceed `MAX_WINDOW_SIZE`.
    *   If a merged window (or even a single inflated molecule) exceeds this cap, strict truncation is applied at the limit.

## 3. Dynamic Density Strategy (Adaptive Windowing)
To maximize **Recall** within a fixed **Token Budget**, the system dynamically scales the `MAX_WINDOW_SIZE` and `PADDING_CHARS` based on the number of search hits.

### 3.1 The Logic (Quantity First)
We prioritize **Count (Recall)** over **Size (Detail)**, down to a "Minimum Viable" floor.

```typescript
MinViableSize = 150 chars (approx 50pad + 50content + 50pad)

// 1. Can we fit EVERY result?
MinTotalBudget = ResultsCount * MinViableSize

if (MinTotalBudget > TotalBudget) {
    // SQUEEZE: We have too many results.
    // Truncate list to fit budget at minimal viable quality.
    SafeCount = TotalBudget / MinViableSize
    Results = Results.slice(0, SafeCount)
    TargetWindowSize = MinViableSize
} else {
    // EXPAND: We can fit everyone. 
    // Share budget equally.
    TargetWindowSize = TotalBudget / ResultsCount
}

TargetPadding = (TargetWindowSize / 2) clamped to [50, 500]
```

### 3.2 Constraints
- **MIN_PADDING**: 50 chars (Ensures minimal context like `<50>search<50>`).
- **MAX_PADDING**: 500 chars (Prevents bloat when few results found).
- **MIN_WINDOW_CAP**: 200 chars (Absolute floor for a useful card).
- **Static Fallback**: If no budget is provided, defaults to 2500 chars (safe max).

## 4. Architecture
- **Service**: `ContextInflator` (Engine Service).
- **Input**: List of `SearchResult` objects + `TotalBudget` (optional).
- **Data Source**: Fetches raw content from CozoDB `compounds` table (specifically `compound_body` column).
- **Output**: List of `SearchResult` objects with `is_inflated: true` and `content` replaced by the inflated slice (with visual markers `...`).

## 5. Integration
Inflation occurs **after** search scoring/ranking but **before** the final Token Budgeting.
*   **Semantic Search**: `src/services/semantic/semantic-search.ts`
*   **Molecule Search**: `src/services/search/search.ts`

## 6. Tuning History
- **2026-01-30**: Implemented Dynamic Density.
    - Added `totalBudget` param to `ContextInflator.inflate`.
    - Logic: High result count -> Smaller windows (down to 200 chars). Low result count -> Larger windows (up to 2500 chars).
