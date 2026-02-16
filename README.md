# eslint-plugin-sql-typing

Auto-generate TypeScript types from SQL queries.

## Installation

```bash
npm install eslint-plugin-sql-typing mysql2
```

## Usage

### ESLint Configuration (Flat Config)

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

### Before

```typescript
const [rows] = await pool.execute("SELECT id, name FROM users");
// Type of rows is unknown
```

### After (auto-fixed)

```typescript
import type { RowDataPacket } from "mysql2/promise";

const [rows] = await pool.execute<(RowDataPacket & { id: number; name: string })[]>(
  "SELECT id, name FROM users",
);
// Type of rows is correctly inferred
```

## Configuration Options

| Option              | Type    | Default                 | Description              |
| ------------------- | ------- | ----------------------- | ------------------------ |
| `database.host`     | string  | -                       | MySQL host               |
| `database.port`     | number  | 3306                    | MySQL port               |
| `database.user`     | string  | -                       | MySQL user               |
| `database.password` | string  | -                       | MySQL password           |
| `database.database` | string  | -                       | MySQL database name      |
| `schemaVersion`     | string  | "default"               | Cache invalidation key   |
| `enableInCI`        | boolean | false                   | Enable in CI environment |
| `cacheDir`          | string  | node_modules/.cache/... | Cache directory          |

## CI Environment

By default, the plugin is disabled when `process.env.CI === "true"`.
Set `enableInCI: true` to enable it in CI.

## Type Mapping

| MySQL Type                   | TypeScript Type |
| ---------------------------- | --------------- |
| INT, TINYINT, SMALLINT, etc. | `number`        |
| BIGINT, DECIMAL              | `string`        |
| VARCHAR, TEXT                | `string`        |
| DATE, DATETIME, TIMESTAMP    | `Date`          |
| JSON                         | `unknown`       |
| ENUM                         | union type      |

## License

MIT
