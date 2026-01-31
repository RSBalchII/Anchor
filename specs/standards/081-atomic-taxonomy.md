# Atomic Taxonomy (V4) & Universal Data API

**Status:** Active | **Authority:** System Core

## 1. Abstract
This standard defines the **Atomic Taxonomy** (V4), replacing the legacy Chunk-based data topology with a granular structure comprising **Compounds**, **Molecules**, and **Atoms**. This shift enables the **Universal Data API**, allowing for precise, sentence-level retrieval and manipulation of enhanced context.

## 2. The Atomic Taxonomy
Data is no longer stored as arbitrary "chunks" but as structured chemical entities.

### 2.1 Compounds (Type: `file`)
*   **Definition:** The storable substance. Equivalent to a file or a complete document.
*   **Role:** The container for all constituent elements.
*   **Properties:**
    *   `compound_body`: The full text content.
    *   `molecular_signature`: SimHash of the entire content (for file-level deduplication).
*   **Analogy:** A "Page" in a book.

### 2.2 Molecules (Type: `fragment`)
*   **Definition:** The logical arrangement of atoms. Equivalent to a **sentence** or a discrete thought.
*   **Role:** The fundamental unit of retrieval (`Universal Data API`).
*   **Properties:**
    *   `content`: The sentence text.
    *   `sequence`: Positional index within the Compound.
    *   `tags`: Derived concepts.
*   **Granularity:** Retrieval targets Molecules, not Compounds. This reduces context window pollution (e.g., retrieving just the relevant function definition, not the whole file).

### 2.3 Atoms (Type: `concept`)
*   **Definition:** The fundamental unit of meaning. Equivalent to a keyword, entity, or tag.
*   **Role:** The connective tissue (Edges/Vertices) that links Molecules.
*   **Examples:** `#Project:ECE`, `#SimHash`, `IngestionService`.

## 2.4 Visual Representation

```mermaid
graph TD
    subgraph "Compound (Document/File)"
        C[Compound<br/>ID: comp_xxx<br/>Path: /notebook/file.md<br/>Timestamp: 1234567890<br/>Provenance: internal<br/>Molecular Signature: abc123]
    end

    subgraph "Molecules (Text Segments)"
        M1[Molecule 1<br/>ID: mol_xxx_001<br/>Content: 'This is the first segment'<br/>Sequence: 0<br/>Compound ID: comp_xxx<br/>Start Byte: 0<br/>End Byte: 25<br/>Type: prose<br/>Molecular Signature: def456]

        M2[Molecule 2<br/>ID: mol_xxx_002<br/>Content: 'This is the second segment'<br/>Sequence: 1<br/>Compound ID: comp_xxx<br/>Start Byte: 26<br/>End Byte: 55<br/>Type: prose<br/>Molecular Signature: ghi789]

        M3[Molecule 3<br/>ID: mol_xxx_003<br/>Content: 'Code block here'<br/>Sequence: 2<br/>Compound ID: comp_xxx<br/>Start Byte: 56<br/>End Byte: 80<br/>Type: code<br/>Molecular Signature: jkl012]
    end

    subgraph "Atoms (Semantic Units)"
        A1[Atom: #project:ECE_Core<br/>Type: system<br/>Weight: 1.0]
        A2[Atom: #src<br/>Type: system<br/>Weight: 1.0]
        A3[Atom: #code<br/>Type: system<br/>Weight: 1.0]
        A4[Atom: #typescript<br/>Type: concept<br/>Weight: 0.8]
        A5[Atom: #database<br/>Type: concept<br/>Weight: 0.9]
    end

    C --> M1
    C --> M2
    C --> M3
    M1 --> A1
    M1 --> A2
    M1 --> A4
    M2 --> A1
    M2 --> A5
    M3 --> A3
    M3 --> A4
```

## 3. The Universal Data API
By storing data as Molecules, we unlock a "Universal Data API."

*   **Query:** "How does SimHash work?"
*   **Legacy Result:** Returns the entire `refiner.ts` file (2000 lines).
*   **Universal API Result:** Returns 3 specific Molecules (Sentences) from `refiner.ts` that explain SimHash, plus 2 Molecules from `README.md`.
*   **Benefit:**
    *   **High Signal/Noise Ratio:** 95%+ relevant content in context window.
    *   **Precision:** exact answers without hallucination.

## 4. Migration Guide (Legacy to V4)
*   **Refiner** → **AtomizerService**
*   **SimHash** → **Molecular Signature**
*   **Chunk** → **Molecule**

## 5. Persistence Strategy
*   **Table `compounds`**: Stores full file bodies (for reconstruction).
*   **Table `molecules`** (formerly `memory` fragment rows): Stores searchable sentences.
*   **Table `atoms`**: Stores global entities.

## 6. Processing Flow

```mermaid
flowchart TD
    A[Raw Content<br/>Text File, Code, etc.] --> B{Content Type}

    B -->|Prose| C[Prose Processing<br/>Sentence Splitting]
    B -->|Code| D[Code Processing<br/>AST-based Splitting]
    B -->|Data| E[Data Processing<br/>Row/Line Splitting]

    C --> F[Sanitization<br/>Key Assassin Protocol]
    D --> F
    E --> F

    F --> G[Semantic Analysis<br/>Entity Extraction]
    G --> H[Semantic Categorization<br/>Relationship/Narrative/Technical Tags]

    H --> I[Compound Creation<br/>ID: comp_[hash of content+path]<br/>Contains full content])
    I --> J[Molecule Extraction<br/>Semantic Segments<br/>with byte coordinates]

    J --> K[Molecule 1<br/>ID: mol_[hash]<br/>Content: [segment text]<br/>Start: [byte offset]<br/>End: [byte offset]<br/>Type: prose/code/data<br/>Sequence: 0]

    J --> L[Molecule 2<br/>ID: mol_[hash]<br/>Content: [segment text]<br/>Start: [byte offset]<br/>End: [byte offset]<br/>Type: prose/code/data<br/>Sequence: 1]

    J --> M[Other Molecules<br/>...]

    G --> N[System Atoms<br/>#project, #src, #code, etc.]
    H --> O[Semantic Atoms<br/>#Relationship, #Narrative, etc.]
    K --> P[K-Molecule Atoms<br/>Specific entities in segment]
    L --> Q[L-Molecule Atoms<br/>Specific entities in segment]
    M --> R[Other Molecule Atoms<br/>...]

    I --> S[Compound Atoms<br/>Aggregated from all molecules]
    I --> T[Compound Molecules<br/>IDs of all molecules]

    K --> U[Molecule-Compound Link<br/>compoundId reference]
    L --> U
    M --> U

    N --> V[Atom Deduplication<br/>Remove duplicates across system])
    O --> V
    P --> V
    Q --> V
    R --> V

    V --> W[Final Atoms<br/>Unique atom IDs with labels])

    I --> X{Persist to Database}
    K --> X
    L --> X
    M --> X
    W --> X

    X --> Y[CozoDB Tables:<br/>- compounds table<br/>- molecules table<br/>- atoms table<br/>- atom_edges table]
```
