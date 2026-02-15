# types Directory

## Responsibility

Provide TypeScript type definitions used throughout the plugin.
Centrally manage common types that other modules depend on, ensuring type safety.

## File Structure

```
types/
├── overview.md
├── metadata.ts    # Query metadata types
├── inference.ts   # Type inference result types
├── config.ts      # Configuration option types
└── index.ts       # Re-exports
```

## Key Types

### QueryMetadata

Represents column information retrieved from MySQL:

```typescript
interface ColumnMetadata {
  name: string; // Column name
  alias?: string; // Alias from AS clause
  table: string | null; // Table name (null for expressions)
  type: string; // MySQL type name (INT, VARCHAR, etc.)
  typeCode: number; // MySQL type code
  nullable: boolean; // Whether NULL is allowed
  enumValues?: string[]; // Value list for ENUM types
  isAggregate?: boolean; // Whether it's an aggregate function
}

interface QueryMetadata {
  columns: ColumnMetadata[];
}
```

### InferredTypes

Type inference result for TypeScript:

```typescript
interface TypeInfo {
  type: string; // TypeScript type (number, string, Date, etc.)
  nullable: boolean;
  enumValues?: string[]; // For enum types
  table?: string; // For nestTables option
}

type InferredTypes = Record<string, TypeInfo>;
```

### DatabaseConfig / PluginConfig

Configuration options:

```typescript
interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface PluginConfig {
  database: DatabaseConfig;
  schemaVersion?: string;
  enableInCI?: boolean;
  cacheDir?: string;
}
```

## Design Principles

- Avoid circular dependencies: types should not depend on other src modules
- Re-export external library types as needed
- Only place stable, infrequently-changed types here
