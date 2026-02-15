# eslint-plugin-sql-typing

## Overview

An ESLint plugin that auto-generates TypeScript types from SQL queries.
Validates and auto-fixes type annotations for mysql2 `execute()` / `query()` methods.

## Directory Structure

```sh
src/
├── overview.md           # This file
├── index.ts              # Plugin entry point
├── types/                # Common type definitions
├── core/                 # Core logic (DB/library independent)
├── adapters/             # External system connections
├── cache/                # Query cache
└── rules/                # ESLint rules
```

## Overall Architecture

```mermaid
flowchart TB
    subgraph ESLint
        Plugin[index.ts]
        Rule[rules/check-sql]
    end

    subgraph Core
        Parser[sql-parser]
        Inference[type-inference]
        Generator[type-generator]
    end

    subgraph Adapters
        DBAdapter[MySQLAdapter]
        LibAdapter[MySQL2Adapter]
    end

    subgraph External
        DB[(MySQL)]
        AST[TypeScript AST]
    end

    Cache[(Cache)]

    Plugin --> Rule
    Rule --> LibAdapter
    LibAdapter --> AST
    Rule --> Cache
    Cache --> DBAdapter
    DBAdapter --> DB
    DBAdapter --> Inference
    Inference --> Generator
    Generator --> Rule
```

## Data Flow

```mermaid
sequenceDiagram
    participant ESLint
    participant Rule as check-sql
    participant Lib as MySQL2Adapter
    participant Cache
    participant DB as MySQLAdapter
    participant Core

    ESLint->>Rule: Detect CallExpression
    Rule->>Lib: Extract SQL
    Lib-->>Rule: SQL string
    Rule->>Cache: Get metadata
    alt Cache hit
        Cache-->>Rule: QueryMetadata
    else Cache miss
        Cache->>DB: Execute query
        DB-->>Cache: QueryMetadata
        Cache-->>Rule: QueryMetadata
    end
    Rule->>Core: Type inference + generation
    Core-->>Rule: TypeScript type string
    Rule->>Lib: Compare with existing type
    Lib-->>Rule: Comparison result
    Rule->>ESLint: Report error / Fix
```

## Dependencies

```mermaid
flowchart BT
    types[types]
    core[core]
    adapters[adapters]
    cache[cache]
    rules[rules]
    index[index.ts]

    core --> types
    adapters --> types
    adapters --> core
    cache --> types
    rules --> types
    rules --> core
    rules --> adapters
    rules --> cache
    index --> rules
```

## Module Responsibilities

| Module      | Responsibility                                                   |
| ----------- | ---------------------------------------------------------------- |
| `types/`    | Common type definitions. No dependencies on other modules        |
| `core/`     | SQL parsing, type inference, type generation. Pure functions     |
| `adapters/` | DB connection, AST operations. Encapsulate external dependencies |
| `cache/`    | Metadata caching. Maintain performance                           |
| `rules/`    | ESLint rules. Integrate all components                           |
| `index.ts`  | Export as plugin                                                 |

## Entry Point

```typescript
// index.ts
export default {
  rules: {
    "check-sql": checkSqlRule,
  },
  configs: {
    recommended: {
      plugins: ["sql-typing"],
      rules: {
        "sql-typing/check-sql": "error",
      },
    },
  },
};
```

## Configuration Example

```javascript
// eslint.config.js
import sqlTyping from "eslint-plugin-sql-typing";

export default [
  {
    plugins: {
      "sql-typing": sqlTyping,
    },
    rules: {
      "sql-typing/check-sql": "error",
    },
    settings: {
      "sql-typing": {
        database: {
          host: "localhost",
          port: 3306,
          user: "root",
          password: "password",
          database: "myapp",
        },
        schemaVersion: "v1",
      },
    },
  },
];
```
