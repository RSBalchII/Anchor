# ECE_Core Search Architecture - Tag-Walker Protocol

## Overview of Search Architecture

```mermaid
graph TB
    subgraph "Query Input"
        Q[Natural Language Query]
        PT[Parse & Tokenize]
        NL[NLP Processing]
        QE[Query Expansion]
    end
    
    subgraph "Search Strategies"
        EN[Engram Lookup<br/>O(1) Access]
        TW[Tag-Walker<br/>Graph Traversal]
        FTS[Full-Text Search<br/>CozoDB FTS]
        SM[Semantic Match<br/>Category Detection]
    end
    
    subgraph "Database Queries"
        QRY1[FTS Query<br/>~memory:content_fts]
        QRY2[Graph Query<br/>*memory{*} joins]
        QRY3[Engram Query<br/>*engrams{*}]
        QRY4[Semantic Query<br/>Category filters]
    end
    
    subgraph "Database Tables"
        MEM[(memory table<br/>Main storage)]
        MOL[(molecules table<br/>Molecular coords)]
        ATOM[(atoms table<br/>Semantic units)]
        EDGE[(atom_edges table<br/>Relationships)]
        ENG[(engrams table<br/>Lexical sidecar)]
    end
    
    subgraph "Results Processing"
        FIL[Filter & Dedupe]
        SCO[Score & Rank]
        INFL[Context Inflation]
        MERGE[Merge Results]
    end
    
    subgraph "Output"
        RES[Ranked Results]
        CON[Context Assembly]
        API[API Response]
    end
    
    Q --> PT
    PT --> NL
    NL --> QE
    
    QE --> EN
    QE --> TW
    QE --> FTS
    QE --> SM
    
    EN --> QRY3
    TW --> QRY2
    FTS --> QRY1
    SM --> QRY4
    
    QRY1 --> MEM
    QRY2 --> MEM
    QRY2 --> MOL
    QRY2 --> ATOM
    QRY2 --> EDGE
    QRY3 --> ENG
    QRY4 --> MEM
    
    MEM --> FIL
    MOL --> FIL
    ATOM --> FIL
    ENG --> FIL
    
    FIL --> SCO
    SCO --> INFL
    INFL --> MERGE
    MERGE --> RES
    RES --> CON
    CON --> API
```

## Tag-Walker Protocol Flow

```mermaid
sequenceDiagram
    participant Q as Query
    participant P as Parser
    participant E as Expander
    participant T as Tag-Walker
    participant DB as Database
    participant R as Results
    participant I as Inflator
    
    Q->>P: Natural language query
    P->>E: Parse and extract keywords
    E->>T: Expanded query with tags
    T->>DB: FTS query for anchors
    DB-->>T: Anchor results
    T->>DB: Graph traversal for related
    DB-->>T: Related results
    T->>R: Raw results
    R->>I: Results for inflation
    I->>R: Inflated results
    R-->>Q: Final ranked results
```

## Detailed Tag-Walker Algorithm

```mermaid
flowchart TD
    A[Input Query] --> B{Parse Query<br/>Extract Tags & Keywords}
    
    B --> C[Generate Engram Key]
    C --> D{Check Engram Cache}
    
    D -->|Hit| E[Retrieve Cached IDs]
    D -->|Miss| F[Execute FTS Search]
    
    E --> G[Fetch Content by IDs]
    F --> G
    
    G --> H{Apply Tag-Walker<br/>Graph Traversal}
    
    H --> I[Find Anchor Results<br/>Direct FTS matches]
    H --> J[Find Related Results<br/>Tag-based traversal]
    
    I --> K[Apply Provenance Boosting]
    J --> L[Apply Type-Based Scoring]
    
    K --> M[Combine & Deduplicate]
    L --> M
    
    M --> N{Apply Context Inflation}
    N --> O[Calculate Final Scores]
    O --> P[Rank & Limit Results]
    P --> Q[Return Ranked Results]
```

## Search Performance Architecture

```mermaid
graph LR
    subgraph "Query Processing"
        QP[Query Parser]
        QE[Query Expander]
        NF[Natural Language Filter]
    end
    
    subgraph "Search Execution"
        SA[Search Arbitrator]
        S1[Strategy 1: Direct]
        S2[Strategy 2: Graph Walk]
        S3[Strategy 3: Semantic]
        S4[Strategy 4: Engram]
    end
    
    subgraph "Database Layer"
        IDX[FTS Index]
        GR[Graph Index]
        VEC[Vector Index]
        TAB[CozoDB Tables]
    end
    
    subgraph "Results Processing"
        SCP[Scoring Pipeline]
        DDP[Deduplication]
        INFL[Inflation Engine]
        RANK[Ranking Engine]
    end
    
    subgraph "Performance Metrics"
        PM1[Query Latency]
        PM2[Result Relevance]
        PM3[Memory Usage]
        PM4[Cache Hit Rate]
    end
    
    QP --> QE
    QE --> NF
    NF --> SA
    
    SA --> S1
    SA --> S2
    SA --> S3
    SA --> S4
    
    S1 --> IDX
    S2 --> GR
    S3 --> VEC
    S4 --> TAB
    
    IDX --> SCP
    GR --> SCP
    VEC --> SCP
    TAB --> SCP
    
    SCP --> DDP
    DDP --> INFL
    INFL --> RANK
    
    S1 --> PM1
    S2 --> PM1
    S3 --> PM2
    S4 --> PM4
    SCP --> PM3
```

## CozoDB Query Patterns

```mermaid
graph TD
    subgraph "FTS Query Pattern"
        FQ[~memory:content_fts{id | query: $query, k: 50, bind_score: fts_score}]
        FM[*memory{id, content, source, timestamp, buckets, tags, epochs, provenance, simhash}]
    end
    
    subgraph "Graph Walk Pattern"
        GQ[*memory{id: anchor_id, tags: anchor_tags}, anchor_id in $anchorIds]
        GT[tag in anchor_tags, *memory{id, content, source, timestamp, buckets, tags, epochs, provenance, sequence, simhash, type}]
        GF[tag in tags, id != anchor_id]
    end
    
    subgraph "Join Pattern"
        JP[*molecules{id, start_byte, end_byte, type, numeric_value, numeric_unit, compound_id}]
    end
    
    FQ --> FM
    GQ --> GT
    GT --> GF
    FM --> JP
    GT --> JP
```