# eslint-plugin-sql-typing Functional Overview

## Overview

This project is an ESLint plugin that automatically generates TypeScript types from raw SQL queries.
Inspired by SafeQL, this project primarily aims to support MySQL, whereas SafeQL currently only supports PostgreSQL.

## Design Philosophy

### Minimal Adoption and Removal Cost

- **No changes to existing coding styles**: Does not force the use of tagged template literals (e.g., `sql` tags).
- **Supports standard string literals**: Can be applied directly to existing codebases.
- **Easy to add or remove**: The plugin can be introduced or removed without any code modifications.

### Performance First

- Minimize overhead during SQL detection.
- Actively adopt optimization techniques such as memoization.

### Dependency Inversion Principle (DIP)

Clearly separate core functionality from library-dependent parts.

```mermaid
graph TB
    subgraph Core["Core Layer"]
        Parser["SQL Parser<br/>(Query Analysis)"]
        Inference["Type Inference<br/>(Inference Engine)"]
        Generator["Type Generator<br/>(Type Generation)"]
    end

    subgraph Interfaces["Interfaces"]
        IDB["IDatabaseAdapter"]
        ILib["ILibraryAdapter"]
    end

    subgraph DBAdapters["Database Adapters"]
        MySQL["MySQL Adapter"]
        PostgreSQL["PostgreSQL Adapter"]
    end

    subgraph LibAdapters["Library Adapters"]
        mysql2["mysql2 Adapter"]
        Prisma["Prisma Adapter"]
        TypeORM["TypeORM Adapter"]
    end

    Parser --> Inference
    Inference --> Generator

    IDB -.-> Core
    ILib -.-> Core

    MySQL --> IDB
    PostgreSQL --> IDB

    mysql2 --> ILib
    Prisma --> ILib
    TypeORM --> ILib
```

#### Core Layer

- **SQL Parser**: Analyzes SQL queries (e.g., extracting columns from SELECT statements).
- **Type Inference Engine**: Infers TypeScript types from Prepared Statement results.
- **Type Generator**: Generates TypeScript type strings.

#### Adapter Layer

##### IDatabaseAdapter

```typescript
interface IDatabaseAdapter {
  // Retrieve query metadata using Prepared Statements
  getQueryMetadata(query: string): Promise<QueryMetadata>;

  // Retrieve supplemental info such as ENUM values
  getSchemaInfo(tableName: string): Promise<SchemaInfo>;

  // Close the connection
  close(): Promise<void>;
}
```

##### ILibraryAdapter

```typescript
interface ILibraryAdapter {
  // Determine if the library is a target
  isTarget(node: TSESTree.CallExpression): boolean;

  // Get the insertion point for generic types
  getTypeInsertionPoint(node: TSESTree.CallExpression): InsertionPoint;

  // Get the format of the generated type (e.g., QueryResult wrapper)
  getTypeWrapper(): TypeWrapper | null;

  // Parse optional arguments from the AST that affect type generation
  parseQueryOptions(node: TSESTree.CallExpression): QueryOptions | null;
}

interface QueryOptions {
  // mysql2: nestTables option (resolves column name conflicts during JOINs)
  nestTables?: boolean;
  // mysql2: rowsAsArray option (returns results as an array)
  rowsAsArray?: boolean;
}
```

##### Type Generation variations based on mysql2 options

The generated types change depending on `nestTables` or `rowsAsArray` options.

```typescript
// nestTables: false (Default) - Flat type
connection.query<{ id: number; user_id: number; user_name: string }[]>(
  "SELECT o.id, u.id as user_id, u.name as user_name FROM orders o JOIN users u ...",
);

// nestTables: true - Nested type by table name
connection.query<
  {
    orders: { id: number };
    users: { id: number; name: string };
  }[]
>({ sql: "SELECT o.id, u.id, u.name FROM orders o JOIN users u ...", nestTables: true });

// rowsAsArray: true - Array type
connection.query<[number, string][]>({ sql: "SELECT id, name FROM users", rowsAsArray: true });
```

---

## Supported Environments

### Databases

| DB         | Initial Support | Future Support |
| ---------- | --------------- | -------------- |
| MySQL      | ✅              | -              |
| PostgreSQL | -               | ✅             |
| MariaDB    | -               | ✅             |

### Client Libraries

| Library | Initial Support | Future Support |
| ------- | --------------- | -------------- |
| mysql2  | ✅              | -              |
| Prisma  | -               | ✅             |
| TypeORM | -               | ✅             |
| mariadb | -               | ✅             |

---

## Key Features

### 1. Automatic Type Generation for SQL Query Results

Automatically inserts return types as generics for SQL queries using the ESLint autofix feature.

#### Before (Pre-autofix)

```typescript
const users = await connection.execute("SELECT id, name FROM users");
```

#### After (Post-autofix)

```typescript
const users = await connection.execute<{ id: number; name: string }[]>(
  "SELECT id, name FROM users",
);
```

### 2. Type Validation

Reports ESLint errors if existing generic types do not match the actual schema.

```typescript
// Error: id should be of type number
const users = await connection.execute<{ id: string; name: string }[]>(
  "SELECT id, name FROM users",
);
```

### 3. Automatic Type Correction (autofix)

If an incorrect type is specified, autofix overwrites it with the correct type.

```typescript
// Before (Incorrect type)
connection.execute<{ id: string }[]>("SELECT id FROM users");

// After (Corrected by autofix)
connection.execute<{ id: number }[]>("SELECT id FROM users");
```

---

## Type Generation Specifications

### Type Format

- **Array Type**: Results are always represented as an array type `Type[]`.
- **Object Type**: Each row is an object type `{ column: type }`.

```typescript
// Example of generated type
connection.execute<
  {
    id: number;
    name: string;
    email: string | null;
    status: "pending" | "active" | "inactive";
  }[]
>("SELECT id, name, email, status FROM users");
```

### Library-Specific Type Wrappers

Since the return type varies by library, the library adapter provides an appropriate type wrapper.

#### For mysql2

The return value of mysql2's `query` / `execute` methods is a `QueryResult` type, not a pure object array `T[]`.

Reference: <https://github.com/sidorares/node-mysql2/blob/master/typings/mysql/lib/protocol/packets/index.d.ts>

```typescript
// Actual mysql2 type definition
type QueryResult =
  | RowDataPacket[][]
  | RowDataPacket[]
  | ResultSetHeader
  | ResultSetHeader[]
  | OkPacket
  | OkPacket[];

// When specifying generics
connection.execute<RowDataPacket[]>("SELECT ...");
```

Therefore, the mysql2 library adapter needs to generate types as follows:

```typescript
// Internally inferred type
type InferredRow = { id: number; name: string };

// Actually generated type (for mysql2)
// Option A: Intersection with RowDataPacket
connection.execute<(RowDataPacket & { id: number; name: string })[]>("...");

// Option B: Format encouraging type assertion
// (The optimal method will be determined during implementation)
```

**Note**: The implementation of this type wrapper will be decided after investigating actual mysql2 behavior.

#### Alternatives: JSDoc / Type Assertion

Consider the following modes as escape hatches if putting types into generics causes errors.

```typescript
// Option C: Using Type Assertion
const [rows] = (await connection.query("SELECT id, name FROM users")) as [
  (RowDataPacket & { id: number; name: string })[],
  FieldPacket[],
];

// Option D: Using JSDoc (@type)
/** @type {[(RowDataPacket & { id: number; name: string })[], FieldPacket[]]} */
const [rows] = await connection.query("SELECT id, name FROM users");
```

Allow specifying `typeInsertionMode` in the configuration:

```javascript
// eslint.config.js
{
  "sql-typing/check-sql": ["error", {
    connections: [{
      // ...
      typeInsertionMode: "generics" | "assertion" | "jsdoc"
    }]
  }]
}
```

### MySQL Type → TypeScript Type Mapping

| MySQL Type | TypeScript Type | Remarks                         |
| ---------- | --------------- | ------------------------------- |
| TINYINT    | `number`        |                                 |
| SMALLINT   | `number`        |                                 |
| MEDIUMINT  | `number`        |                                 |
| INT        | `number`        |                                 |
| BIGINT     | `string`        | Outside the range of JS numbers |
| FLOAT      | `number`        |                                 |
| DOUBLE     | `number`        |                                 |
| DECIMAL    | `string`        | To maintain precision           |
| VARCHAR    | `string`        |                                 |
| CHAR       | `string`        |                                 |
| TEXT       | `string`        |                                 |
| BLOB       | `Buffer`        |                                 |
| DATE       | `Date`          |                                 |
| DATETIME   | `Date`          |                                 |
| TIMESTAMP  | `Date`          |                                 |
| TIME       | `string`        |                                 |
| YEAR       | `number`        |                                 |
| JSON       | `unknown`       | Configurable                    |
| ENUM       | union type      | `"a" \| "b" \| "c"`             |
| SET        | `string`        |                                 |

### Handling NULL

- Nullable columns are represented as a union type with `| null`.
- Follows actual mysql2 behavior.

```typescript
// If the email column is nullable
{
  email: string | null;
}
```

### Handling ENUM Types

- Strictly represent ENUM values as union types.
- Generate types by retrieving ENUM definitions from `INFORMATION_SCHEMA`.

```typescript
// For status ENUM('pending', 'active', 'inactive')
{
  status: "pending" | "active" | "inactive";
}
```

---

## SQL Detection Methods

### Targets

Recognize the following patterns as SQL queries:

1. **Method Name Detection**: Calls to methods such as `execute`, `query`, or `prepare`.
2. **Type-based Detection**: Determine method types using typescript-eslint type information.
3. **SQL Pattern Detection**: Strings starting with `SELECT`, `INSERT`, `UPDATE`, `DELETE`, etc.

### Performance Considerations

- Prioritize detection methods based on performance.
- If retrieving type information becomes an overhead, prioritize detection by method names or SQL patterns.

### SQL in Variables

```typescript
const query = "SELECT id, name FROM users";
const users = await connection.execute(query); // Variable reference
```

- **Initial Implementation**: Not supported (only string literals).
- **Future Support**: Plan to track variable values via static analysis.

---

## Configuration

### ESLint Config File (eslint.config.js)

```javascript
import sqlTyping from "eslint-plugin-sql-typing";

export default [
  {
    plugins: {
      "sql-typing": sqlTyping,
    },
    rules: {
      "sql-typing/check-sql": [
        "error",
        {
          connections: [
            {
              // DB connection info
              driver: "mysql",
              databaseUrl: "mysql://user:password@localhost:3306/database",

              // Target specification
              targets: [
                // Detect by method name
                { method: "execute" },
                { method: "query" },

                // Tagged template literals (optional)
                { tag: "sql" },
              ],
            },
          ],
        },
      ],
    },
  },
];
```

### Configuration Options

| Option                           | Type           | Description                     |
| -------------------------------- | -------------- | ------------------------------- |
| `connections`                    | `Connection[]` | Array of DB connection settings |
| `connections[].driver`           | `"mysql"`      | DB driver to use                |
| `connections[].databaseUrl`      | `string`       | DB connection URL               |
| `connections[].targets`          | `Target[]`     | Targets to detect               |
| `connections[].targets[].method` | `string`       | Method names to detect          |
| `connections[].targets[].tag`    | `string`       | Tag names to detect             |

---

## Technical Approach

### Retrieving Type Metadata

Retrieve column type information using MySQL Prepared Statements.

1. **Use mysql2 internal API**: Create a Prepared Statement with `connection.connection.prepare()`.
2. **Retrieve Column Metadata**: Column names, type codes, nullability flags, etc.
3. **Supplement with INFORMATION_SCHEMA**: Supplement information that cannot be obtained via Prepared Statements, such as ENUM values.

### Information Obtainable via Prepared Statements

- `name`: Column name
- `table`: Table name
- `schema`: Schema name
- `columnType`: MySQL type code (numeric)
- `columnLength`: Column length
- `flags`: Flags such as nullability

### Information Obtained from INFORMATION_SCHEMA

- ENUM value definitions (extracted from `COLUMN_TYPE` field)
- Other supplemental info

### Caching Strategy

ESLint may run on every keystroke; sending `PREPARE` to the DB every time would significantly degrade the developer experience (editor responsiveness). To prevent this, the following caching strategy is adopted.

#### Persistent Cache

- Implement a cache that persists even after the process ends (on the file system).
- Cache location: e.g., `node_modules/.cache/eslint-plugin-sql-typing/`.

#### Cache Key

- Use `hash(SQL string + DB schema version)` as the key.
- Calculate the schema version from table update times in `INFORMATION_SCHEMA`, etc.

#### Caching Flow

```mermaid
sequenceDiagram
    participant ESLint
    participant Plugin
    participant Cache
    participant MySQL

    ESLint->>Plugin: Lint File
    Plugin->>Plugin: Extract SQL Strings
    loop For each SQL
        Plugin->>Cache: Get Metadata (Hash(SQL))
        alt Cache Hit
            Cache-->>Plugin: Metadata
        else Cache Miss
            Plugin->>MySQL: PREPARE Statement
            MySQL-->>Plugin: Columns / Params info
            Plugin->>MySQL: DEALLOCATE PREPARE
            Plugin->>Cache: Save Metadata
        end
        Plugin->>Plugin: Generate TS Type
        Plugin->>ESLint: Report Error / Provide Autofix
    end
```

#### Future Optimizations

- **Stale-While-Revalidate**: Return the cache immediately if it exists, and check the DB in the background. Report errors later if the type has changed.

### Connection Strategy

#### Preventing Impact on Production DBs

Type inference using Prepared Statements requires a DB connection, which risks consuming production DB connections. To prevent this, the following strategies are used.

#### Initial Implementation: DB Connection Mode (Dev Environment Only)

```javascript
// eslint.config.js
{
  connections: [
    {
      driver: "mysql",
      databaseUrl: "mysql://user:pass@localhost:3306/dev_db",

      // Connection limit options
      connectionLimit: 1, // Limit concurrent connections to 1
      connectionTimeout: 5000, // Timeout 5 seconds
    },
  ];
}
```

**Recommendations**:

- **Discourage** connection to production DBs.
- Use development environments or local DBs.
- Use Offline Mode (described below) for CI/CD.

#### Behavior in CI/CD Environments

Since DB connection is often difficult in CI/CD environments, the plugin is disabled by default.

##### Default Behavior

```typescript
// If process.env.CI === "true", the plugin does nothing (skips)
if (process.env.CI === "true" && !options.enableInCI) {
  return; // Skip rule
}
```

##### Config Options

```javascript
// eslint.config.js
{
  "sql-typing/check-sql": ["error", {
    // Enable rule even in CI (e.g., when using offline mode)
    enableInCI: true,

    connections: [{
      driver: "mysql",
      schemaSnapshot: "./.sql-typing-schema.json", // Offline Mode
    }]
  }]
}
```

##### Recommended Workflow

```mermaid
flowchart LR
    subgraph Local["Local Development"]
        A[DB Connection Mode] --> B[Run Type Check]
        B --> C[Generate Snapshot]
    end

    subgraph CI["CI/CD"]
        D{enableInCI?}
        D -->|false| E[Skip]
        D -->|true| F[Offline Mode]
        F --> G[Check types via Snapshot]
    end

    C -.->|commit| F
```

| Environment | Default Behavior    | Recommended Config                    |
| ----------- | ------------------- | ------------------------------------- |
| Local Dev   | Enabled (DB Conn)   | Specify `databaseUrl`                 |
| CI/CD       | **Disabled (Skip)** | `enableInCI: true` + `schemaSnapshot` |
| Production  | -                   | ESLint is not executed                |

#### Future Implementation: Offline Mode

Provide methods to obtain schema information without connecting to the DB.

##### Option A: Schema Definition File

```javascript
// eslint.config.js
{
  connections: [
    {
      driver: "mysql",
      // Read schema from SQL file
      schemaFile: "./database/schema.sql",
    },
  ];
}
```

```sql
-- database/schema.sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  status ENUM('pending', 'active', 'inactive') DEFAULT 'pending'
);
```

##### Option B: Schema Snapshot

Retrieve schema information once in a dev environment and save it as a JSON file.

```bash
# Generate schema snapshot
npx eslint-plugin-sql-typing generate-schema \
  --url "mysql://user:pass@localhost:3306/dev_db" \
  --output .sql-typing-schema.json
```

```javascript
// eslint.config.js
{
  connections: [
    {
      driver: "mysql",
      schemaSnapshot: "./.sql-typing-schema.json",
    },
  ];
}
```

```json
// .sql-typing-schema.json
{
  "version": "1.0",
  "generatedAt": "2024-01-15T10:00:00Z",
  "tables": {
    "users": {
      "columns": {
        "id": { "type": "INT", "nullable": false },
        "name": { "type": "VARCHAR(255)", "nullable": false },
        "email": { "type": "VARCHAR(255)", "nullable": true },
        "status": { "type": "ENUM", "values": ["pending", "active", "inactive"], "nullable": false }
      }
    }
  }
}
```

##### Option C: Prisma Schema Integration (Future)

```javascript
// eslint.config.js
{
  connections: [
    {
      driver: "mysql",
      // Get type info from Prisma schema
      prismaSchema: "./prisma/schema.prisma",
    },
  ];
}
```

```prisma
// prisma/schema.prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id     Int     @id @default(autoincrement())
  name   String
  email  String?
  status Status  @default(pending)
}

enum Status {
  pending
  active
  inactive
}
```

#### Mode Priority

```mermaid
flowchart TD
    A[Run ESLint] --> B{schemaSnapshot specified?}
    B -->|Yes| C[Read from Snapshot]
    B -->|No| D{schemaFile specified?}
    D -->|Yes| E[Parse SQL File]
    D -->|No| F{prismaSchema specified?}
    F -->|Yes| G[Parse Prisma Schema]
    F -->|No| H{databaseUrl specified?}
    H -->|Yes| I[Connect to DB]
    H -->|No| J[Error: No Config]

    C --> K[Execute Type Inference]
    E --> K
    G --> K
    I --> K
```

---

## ESLint Rules

### sql-typing/check-sql

The main rule that performs type checking and automatic correction for SQL queries.

#### Error Messages

| Code               | Message                                    | Description                 |
| ------------------ | ------------------------------------------ | --------------------------- |
| `missing-type`     | "Missing type annotation for SQL query"    | No type annotation provided |
| `type-mismatch`    | "Type mismatch: expected {...}, got {...}" | Types do not match          |
| `invalid-sql`      | "Invalid SQL query"                        | SQL syntax error            |
| `connection-error` | "Failed to connect to database"            | DB connection failure       |

#### autofix Behavior

1. **Missing type**: Inserts generic type.
2. **Incorrect type**: Overwrites with the correct type.

---

## Future Extensions

### Additional DB Support

- PostgreSQL: Use the `.describe()` API from the `postgres` library.
- MariaDB: Approach similar to mysql2.

### Additional Library Support

- Prisma: Detect `prisma.$queryRaw`.
- TypeORM: Detect `dataSource.query()`.
- mariadb: Detect `connection.query()`.

### Support for SQL in Variables

- Track variable values via static analysis.
- Analyze string literals declared with `const`.

### Type Checking for Input Parameters

Check types for values passed to `?` in `WHERE id = ?`.

```typescript
// If id column is INT, passing a string is an error
connection.execute("SELECT * FROM users WHERE id = ?", ["invalid"]); // Error
connection.execute("SELECT * FROM users WHERE id = ?", [123]); // OK
```

**Notes**:

- MySQL's `PREPARE` returns parameter type info, but accuracy is questionable (tends to accept everything as strings).
- Focus first on "return value" type checking; input parameters will be addressed in the future.

### Others

- Type checking for INSERT/UPDATE/DELETE statements.
- Type inference for JOIN queries.
- Type inference for subqueries.

---

## References

- [SafeQL](https://github.com/ts-safeql/safeql): ESLint plugin for PostgreSQL.
- [Discussion #449](https://github.com/ts-safeql/safeql/discussions/449): Proposal for MySQL support.
- [PR #448](https://github.com/ts-safeql/safeql/pull/448): POC implementation.
