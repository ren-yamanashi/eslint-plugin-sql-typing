/**
 * ESLint Rule: check-sql Unit Tests
 *
 * These tests verify the check-sql rule correctly:
 * - Detects missing type annotations
 * - Detects wrong type annotations
 * - Handles nullable columns
 * - Handles special MySQL types (ENUM, BIGINT, DECIMAL, etc.)
 * - Auto-fixes type annotations
 */

import { RuleTester } from "@typescript-eslint/rule-tester";
import { describe } from "vitest";

import { checkSqlRule } from "./check-sql.js";

const ruleTester = new RuleTester();

// =============================================================================
// Valid Cases: Simple SELECT Queries
// =============================================================================

describe("check-sql: Valid Simple SELECT", () => {
  ruleTester.run("check-sql", checkSqlRule, {
    valid: [
      // -----------------------------------------------------------------
      // Case: SELECT single column with correct type
      // -----------------------------------------------------------------
      {
        name: "SELECT single INT column with correct number type",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number })[]>(
              "SELECT id FROM users"
            );
          }
        `,
      },

      // -----------------------------------------------------------------
      // Case: SELECT single VARCHAR column with correct type
      // -----------------------------------------------------------------
      {
        name: "SELECT single VARCHAR column with correct string type",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { name: string })[]>(
              "SELECT name FROM users"
            );
          }
        `,
      },

      // -----------------------------------------------------------------
      // Case: SELECT multiple columns with correct types
      // -----------------------------------------------------------------
      {
        name: "SELECT multiple columns with correct types",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; name: string })[]
            >("SELECT id, name FROM users");
          }
        `,
      },

      // -----------------------------------------------------------------
      // Case: SELECT with column alias
      // -----------------------------------------------------------------
      {
        name: "SELECT with column alias uses alias name in type",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { user_id: number; user_name: string })[]
            >("SELECT id AS user_id, name AS user_name FROM users");
          }
        `,
      },

      // -----------------------------------------------------------------
      // Case: SELECT with WHERE clause (same return type)
      // -----------------------------------------------------------------
      {
        name: "SELECT with WHERE clause has same return type",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; name: string })[]
            >("SELECT id, name FROM users WHERE id = 1");
          }
        `,
      },

      // -----------------------------------------------------------------
      // Case: SELECT with LIMIT clause
      // -----------------------------------------------------------------
      {
        name: "SELECT with LIMIT clause has same return type",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; name: string })[]
            >("SELECT id, name FROM users LIMIT 10");
          }
        `,
      },

      // -----------------------------------------------------------------
      // Case: SELECT with ORDER BY clause
      // -----------------------------------------------------------------
      {
        name: "SELECT with ORDER BY clause has same return type",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; name: string })[]
            >("SELECT id, name FROM users ORDER BY id DESC");
          }
        `,
      },

      // -----------------------------------------------------------------
      // Case: Using pool.query() instead of pool.execute()
      // -----------------------------------------------------------------
      {
        name: "pool.query() with correct type annotation",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.query<
              (RowDataPacket & { id: number; name: string })[]
            >("SELECT id, name FROM users");
          }
        `,
      },

      // -----------------------------------------------------------------
      // Case: Template literal SQL string
      // -----------------------------------------------------------------
      {
        name: "Template literal SQL string with correct type",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; name: string })[]
            >(\`SELECT id, name FROM users\`);
          }
        `,
      },

      // -----------------------------------------------------------------
      // Case: Multiline SQL string
      // -----------------------------------------------------------------
      {
        name: "Multiline SQL string with correct type",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; name: string })[]
            >(\`
              SELECT id, name
              FROM users
              WHERE id > 0
            \`);
          }
        `,
      },
    ],

    invalid: [],
  });
});

// =============================================================================
// Valid Cases: Nullable Column Handling
// =============================================================================

describe("check-sql: Valid Nullable Column Handling", () => {
  ruleTester.run("check-sql", checkSqlRule, {
    valid: [
      // -----------------------------------------------------------------
      // Case: Nullable VARCHAR column
      // -----------------------------------------------------------------
      {
        name: "Nullable VARCHAR column typed as string | null",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            // email column is nullable in schema
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; email: string | null })[]
            >("SELECT id, email FROM users");
          }
        `,
      },

      // -----------------------------------------------------------------
      // Case: Nullable INT column
      // -----------------------------------------------------------------
      {
        name: "Nullable INT column typed as number | null",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            // age column is nullable in schema
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; age: number | null })[]
            >("SELECT id, age FROM users");
          }
        `,
      },

      // -----------------------------------------------------------------
      // Case: Nullable TIMESTAMP column
      // -----------------------------------------------------------------
      {
        name: "Nullable TIMESTAMP column typed as Date | null",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            // updated_at column is nullable in schema
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; updated_at: Date | null })[]
            >("SELECT id, updated_at FROM users");
          }
        `,
      },

      // -----------------------------------------------------------------
      // Case: Mix of nullable and non-nullable columns
      // -----------------------------------------------------------------
      {
        name: "Mix of nullable and non-nullable columns",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            // name is NOT NULL, email is nullable
            const [rows] = await pool.execute<
              (RowDataPacket & {
                id: number;
                name: string;
                email: string | null;
              })[]
            >("SELECT id, name, email FROM users");
          }
        `,
      },

      // -----------------------------------------------------------------
      // Case: Multiple nullable columns
      // -----------------------------------------------------------------
      {
        name: "Multiple nullable columns",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & {
                id: number;
                email: string | null;
                age: number | null;
                updated_at: Date | null;
              })[]
            >("SELECT id, email, age, updated_at FROM users");
          }
        `,
      },

      // -----------------------------------------------------------------
      // Case: Non-nullable column should NOT have | null
      // -----------------------------------------------------------------
      {
        name: "Non-nullable columns without | null annotation",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            // name and created_at are NOT NULL
            const [rows] = await pool.execute<
              (RowDataPacket & {
                id: number;
                name: string;
                created_at: Date;
              })[]
            >("SELECT id, name, created_at FROM users");
          }
        `,
      },

      // -----------------------------------------------------------------
      // Case: TEXT column (nullable)
      // -----------------------------------------------------------------
      {
        name: "Nullable TEXT column typed as string | null",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            // content column in posts is nullable TEXT
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; content: string | null })[]
            >("SELECT id, content FROM posts");
          }
        `,
      },

      // -----------------------------------------------------------------
      // Case: JSON column (nullable)
      // -----------------------------------------------------------------
      {
        name: "Nullable JSON column typed as unknown (or null)",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            // metadata column in users is nullable JSON
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; metadata: unknown | null })[]
            >("SELECT id, metadata FROM users");
          }
        `,
      },
    ],

    invalid: [],
  });
});

// =============================================================================
// Valid Cases: Special MySQL Types
// =============================================================================

describe("check-sql: Valid Special MySQL Types", () => {
  ruleTester.run("check-sql", checkSqlRule, {
    valid: [
      // =================================================================
      // ENUM Type
      // =================================================================

      // -----------------------------------------------------------------
      // Case: ENUM as union type
      // -----------------------------------------------------------------
      {
        name: "ENUM column typed as union of literal strings",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & {
                id: number;
                status: "pending" | "active" | "inactive";
              })[]
            >("SELECT id, status FROM users");
          }
        `,
      },

      // -----------------------------------------------------------------
      // Case: ENUM with SELECT WHERE on ENUM value
      // -----------------------------------------------------------------
      {
        name: "ENUM in WHERE clause still returns union type",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & {
                id: number;
                name: string;
                status: "pending" | "active" | "inactive";
              })[]
            >("SELECT id, name, status FROM users WHERE status = 'active'");
          }
        `,
      },

      // =================================================================
      // BIGINT Type
      // =================================================================

      // -----------------------------------------------------------------
      // Case: BIGINT as string (outside JS number range)
      // -----------------------------------------------------------------
      {
        name: "BIGINT column typed as string",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            // view_count is BIGINT in posts table
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; view_count: string })[]
            >("SELECT id, view_count FROM posts");
          }
        `,
      },

      // =================================================================
      // DECIMAL Type
      // =================================================================

      // -----------------------------------------------------------------
      // Case: DECIMAL as string (precision preservation)
      // -----------------------------------------------------------------
      {
        name: "DECIMAL column typed as string for precision",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            // balance is DECIMAL(10, 2) in users table
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; balance: string })[]
            >("SELECT id, balance FROM users");
          }
        `,
      },

      // =================================================================
      // DATE/TIMESTAMP Types
      // =================================================================

      // -----------------------------------------------------------------
      // Case: TIMESTAMP as Date
      // -----------------------------------------------------------------
      {
        name: "TIMESTAMP column typed as Date",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; created_at: Date })[]
            >("SELECT id, created_at FROM users");
          }
        `,
      },

      // -----------------------------------------------------------------
      // Case: Nullable TIMESTAMP as Date | null
      // -----------------------------------------------------------------
      {
        name: "Nullable TIMESTAMP column typed as Date | null",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; updated_at: Date | null })[]
            >("SELECT id, updated_at FROM users");
          }
        `,
      },

      // -----------------------------------------------------------------
      // Case: Multiple date columns
      // -----------------------------------------------------------------
      {
        name: "Multiple TIMESTAMP columns with correct types",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & {
                id: number;
                created_at: Date;
                updated_at: Date | null;
              })[]
            >("SELECT id, created_at, updated_at FROM users");
          }
        `,
      },

      // =================================================================
      // TINYINT (BOOLEAN) Type
      // =================================================================

      // -----------------------------------------------------------------
      // Case: TINYINT(1) as number (MySQL doesn't have true boolean)
      // -----------------------------------------------------------------
      {
        name: "TINYINT(1) column typed as number",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            // published is TINYINT(1) in posts table
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; published: number })[]
            >("SELECT id, published FROM posts");
          }
        `,
      },

      // =================================================================
      // JSON Type
      // =================================================================

      // -----------------------------------------------------------------
      // Case: JSON as unknown
      // -----------------------------------------------------------------
      {
        name: "JSON column typed as unknown",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; metadata: unknown | null })[]
            >("SELECT id, metadata FROM users");
          }
        `,
      },

      // =================================================================
      // TEXT Type
      // =================================================================

      // -----------------------------------------------------------------
      // Case: TEXT as string
      // -----------------------------------------------------------------
      {
        name: "TEXT column typed as string",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; body: string })[]
            >("SELECT id, body FROM comments");
          }
        `,
      },

      // -----------------------------------------------------------------
      // Case: Nullable TEXT as string | null
      // -----------------------------------------------------------------
      {
        name: "Nullable TEXT column typed as string | null",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; content: string | null })[]
            >("SELECT id, content FROM posts");
          }
        `,
      },

      // =================================================================
      // All Types Combined
      // =================================================================

      // -----------------------------------------------------------------
      // Case: Query with multiple special types
      // -----------------------------------------------------------------
      {
        name: "Query combining multiple special types",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & {
                id: number;
                name: string;
                email: string | null;
                age: number | null;
                balance: string;
                status: "pending" | "active" | "inactive";
                created_at: Date;
                updated_at: Date | null;
                metadata: unknown | null;
              })[]
            >("SELECT * FROM users");
          }
        `,
      },
    ],

    invalid: [],
  });
});

// =============================================================================
// Invalid Cases: Missing Type Annotations
// =============================================================================

describe("check-sql: Invalid - Missing Type Annotations", () => {
  ruleTester.run("check-sql", checkSqlRule, {
    valid: [],

    invalid: [
      // -----------------------------------------------------------------
      // Case: Simple SELECT without type
      // -----------------------------------------------------------------
      {
        name: "Simple SELECT without type annotation should error",
        code: `
          import { pool } from './connection';

          async function test() {
            const [rows] = await pool.execute("SELECT id, name FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; name: string })[]>("SELECT id, name FROM users");
          }
        `,
        errors: [
          {
            messageId: "missingType",
            data: {
              sql: "SELECT id, name FROM users",
            },
          },
        ],
      },

      // -----------------------------------------------------------------
      // Case: SELECT with ENUM without type
      // -----------------------------------------------------------------
      {
        name: "SELECT with ENUM column without type should error",
        code: `
          import { pool } from './connection';

          async function test() {
            const [rows] = await pool.execute("SELECT id, status FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; status: "pending" | "active" | "inactive" })[]>("SELECT id, status FROM users");
          }
        `,
        errors: [
          {
            messageId: "missingType",
          },
        ],
      },

      // -----------------------------------------------------------------
      // Case: SELECT with nullable columns without type
      // -----------------------------------------------------------------
      {
        name: "SELECT with nullable columns without type should error",
        code: `
          import { pool } from './connection';

          async function test() {
            const [rows] = await pool.execute("SELECT id, email, age FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; email: string | null; age: number | null })[]>("SELECT id, email, age FROM users");
          }
        `,
        errors: [
          {
            messageId: "missingType",
          },
        ],
      },

      // -----------------------------------------------------------------
      // Case: SELECT with BIGINT without type
      // -----------------------------------------------------------------
      {
        name: "SELECT with BIGINT column without type should error",
        code: `
          import { pool } from './connection';

          async function test() {
            const [rows] = await pool.execute("SELECT id, view_count FROM posts");
          }
        `,
        output: `
          import { pool } from './connection';
import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; view_count: string })[]>("SELECT id, view_count FROM posts");
          }
        `,
        errors: [
          {
            messageId: "missingType",
          },
        ],
      },

      // -----------------------------------------------------------------
      // Case: SELECT with DECIMAL without type
      // -----------------------------------------------------------------
      {
        name: "SELECT with DECIMAL column without type should error",
        code: `
          import { pool } from './connection';

          async function test() {
            const [rows] = await pool.execute("SELECT id, balance FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; balance: string })[]>("SELECT id, balance FROM users");
          }
        `,
        errors: [
          {
            messageId: "missingType",
          },
        ],
      },

      // -----------------------------------------------------------------
      // Case: SELECT with DATE columns without type
      // -----------------------------------------------------------------
      {
        name: "SELECT with DATE/TIMESTAMP columns without type should error",
        code: `
          import { pool } from './connection';

          async function test() {
            const [rows] = await pool.execute(
              "SELECT id, created_at, updated_at FROM users"
            );
          }
        `,
        output: `
          import { pool } from './connection';
import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; created_at: Date; updated_at: Date | null })[]>(
              "SELECT id, created_at, updated_at FROM users"
            );
          }
        `,
        errors: [
          {
            messageId: "missingType",
          },
        ],
      },

      // -----------------------------------------------------------------
      // Case: SELECT with alias without type
      // -----------------------------------------------------------------
      {
        name: "SELECT with column alias without type should error",
        code: `
          import { pool } from './connection';

          async function test() {
            const [rows] = await pool.execute(
              "SELECT id AS user_id, name AS user_name FROM users"
            );
          }
        `,
        output: `
          import { pool } from './connection';
import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { user_id: number; user_name: string })[]>(
              "SELECT id AS user_id, name AS user_name FROM users"
            );
          }
        `,
        errors: [
          {
            messageId: "missingType",
          },
        ],
      },

      // -----------------------------------------------------------------
      // Case: pool.query() without type
      // -----------------------------------------------------------------
      {
        name: "pool.query() without type annotation should error",
        code: `
          import { pool } from './connection';

          async function test() {
            const [rows] = await pool.query("SELECT id, name FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.query<(RowDataPacket & { id: number; name: string })[]>("SELECT id, name FROM users");
          }
        `,
        errors: [
          {
            messageId: "missingType",
          },
        ],
      },

      // -----------------------------------------------------------------
      // Case: Template literal SQL without type
      // -----------------------------------------------------------------
      {
        name: "Template literal SQL without type should error",
        code: `
          import { pool } from './connection';

          async function test() {
            const [rows] = await pool.execute(\`SELECT id, name FROM users\`);
          }
        `,
        output: `
          import { pool } from './connection';
import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; name: string })[]>(\`SELECT id, name FROM users\`);
          }
        `,
        errors: [
          {
            messageId: "missingType",
          },
        ],
      },

      // -----------------------------------------------------------------
      // Case: Multiple queries without types in same function
      // -----------------------------------------------------------------
      {
        name: "Multiple queries without types should each error",
        code: `
          import { pool } from './connection';

          async function test() {
            const [users] = await pool.execute("SELECT id, name FROM users");
            const [posts] = await pool.execute("SELECT id, title FROM posts");
          }
        `,
        // Multiple independent fixes - both queries get their own fix
        // First pass: first query gets type annotation
        // Second pass: second query gets type annotation
        output: [
          `
          import { pool } from './connection';
import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [users] = await pool.execute<(RowDataPacket & { id: number; name: string })[]>("SELECT id, name FROM users");
            const [posts] = await pool.execute("SELECT id, title FROM posts");
          }
        `,
          `
          import { pool } from './connection';
import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [users] = await pool.execute<(RowDataPacket & { id: number; name: string })[]>("SELECT id, name FROM users");
            const [posts] = await pool.execute<(RowDataPacket & { id: number; title: string })[]>("SELECT id, title FROM posts");
          }
        `,
        ],
        errors: [
          {
            messageId: "missingType",
            line: 5,
          },
          {
            messageId: "missingType",
            line: 6,
          },
        ],
      },

      // -----------------------------------------------------------------
      // Case: SELECT * without type
      // -----------------------------------------------------------------
      {
        name: "SELECT * without type annotation should error",
        code: `
          import { pool } from './connection';

          async function test() {
            const [rows] = await pool.execute("SELECT * FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; name: string; email: string | null; status: "pending" | "active" | "inactive"; balance: string; created_at: Date; updated_at: Date | null; metadata: unknown | null; age: number | null })[]>("SELECT * FROM users");
          }
        `,
        errors: [
          {
            messageId: "missingType",
          },
        ],
      },

      // -----------------------------------------------------------------
      // Case: Multiline SQL without type
      // -----------------------------------------------------------------
      {
        name: "Multiline SQL without type should error",
        code: `
          import { pool } from './connection';

          async function test() {
            const [rows] = await pool.execute(\`
              SELECT id, name
              FROM users
              WHERE id > 0
            \`);
          }
        `,
        output: `
          import { pool } from './connection';
import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; name: string })[]>(\`
              SELECT id, name
              FROM users
              WHERE id > 0
            \`);
          }
        `,
        errors: [
          {
            messageId: "missingType",
          },
        ],
      },
    ],
  });
});

// =============================================================================
// Invalid Cases: Wrong Type Annotations
// =============================================================================

describe("check-sql: Invalid - Wrong Type Annotations", () => {
  ruleTester.run("check-sql", checkSqlRule, {
    valid: [],

    invalid: [
      // =================================================================
      // Wrong Primitive Types
      // =================================================================

      // -----------------------------------------------------------------
      // Case: INT column typed as string
      // -----------------------------------------------------------------
      {
        name: "INT column incorrectly typed as string should error",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: string; name: string })[]
            >("SELECT id, name FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; name: string })[]>("SELECT id, name FROM users");
          }
        `,
        errors: [
          {
            messageId: "typeMismatch",
            data: {
              expected: "number",
              actual: "string",
              column: "id",
            },
          },
        ],
      },

      // -----------------------------------------------------------------
      // Case: VARCHAR column typed as number
      // -----------------------------------------------------------------
      {
        name: "VARCHAR column incorrectly typed as number should error",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; name: number })[]
            >("SELECT id, name FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; name: string })[]>("SELECT id, name FROM users");
          }
        `,
        errors: [
          {
            messageId: "typeMismatch",
            data: {
              expected: "string",
              actual: "number",
              column: "name",
            },
          },
        ],
      },

      // =================================================================
      // Missing Nullable Annotation
      // =================================================================

      // -----------------------------------------------------------------
      // Case: Nullable column without | null
      // -----------------------------------------------------------------
      {
        name: "Nullable column without | null should error",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; email: string })[]
            >("SELECT id, email FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; email: string | null })[]>("SELECT id, email FROM users");
          }
        `,
        errors: [
          {
            messageId: "typeMismatch",
            data: {
              expected: "string | null",
              actual: "string",
              column: "email",
            },
          },
        ],
      },

      // -----------------------------------------------------------------
      // Case: Non-nullable column with | null (extra null)
      // -----------------------------------------------------------------
      {
        name: "Non-nullable column with extra | null should error",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; name: string | null })[]
            >("SELECT id, name FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; name: string })[]>("SELECT id, name FROM users");
          }
        `,
        errors: [
          {
            messageId: "typeMismatch",
            data: {
              expected: "string",
              actual: "string | null",
              column: "name",
            },
          },
        ],
      },

      // =================================================================
      // ENUM Type Errors
      // =================================================================

      // -----------------------------------------------------------------
      // Case: ENUM as plain string
      // -----------------------------------------------------------------
      {
        name: "ENUM column typed as plain string should error",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; status: string })[]
            >("SELECT id, status FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; status: "pending" | "active" | "inactive" })[]>("SELECT id, status FROM users");
          }
        `,
        errors: [
          {
            messageId: "typeMismatch",
            data: {
              expected: '"pending" | "active" | "inactive"',
              actual: "string",
              column: "status",
            },
          },
        ],
      },

      // -----------------------------------------------------------------
      // Case: ENUM with incomplete values
      // -----------------------------------------------------------------
      {
        name: "ENUM column with incomplete union should error",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; status: "pending" | "active" })[]
            >("SELECT id, status FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; status: "pending" | "active" | "inactive" })[]>("SELECT id, status FROM users");
          }
        `,
        errors: [
          {
            messageId: "typeMismatch",
            data: {
              expected: '"pending" | "active" | "inactive"',
              actual: '"pending" | "active"',
              column: "status",
            },
          },
        ],
      },

      // =================================================================
      // BIGINT/DECIMAL Type Errors
      // =================================================================

      // -----------------------------------------------------------------
      // Case: BIGINT as number
      // -----------------------------------------------------------------
      {
        name: "BIGINT column typed as number should error",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; view_count: number })[]
            >("SELECT id, view_count FROM posts");
          }
        `,
        output: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; view_count: string })[]>("SELECT id, view_count FROM posts");
          }
        `,
        errors: [
          {
            messageId: "typeMismatch",
            data: {
              expected: "string",
              actual: "number",
              column: "view_count",
            },
          },
        ],
      },

      // -----------------------------------------------------------------
      // Case: DECIMAL as number
      // -----------------------------------------------------------------
      {
        name: "DECIMAL column typed as number should error",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; balance: number })[]
            >("SELECT id, balance FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; balance: string })[]>("SELECT id, balance FROM users");
          }
        `,
        errors: [
          {
            messageId: "typeMismatch",
            data: {
              expected: "string",
              actual: "number",
              column: "balance",
            },
          },
        ],
      },

      // =================================================================
      // DATE/TIMESTAMP Type Errors
      // =================================================================

      // -----------------------------------------------------------------
      // Case: TIMESTAMP as string
      // -----------------------------------------------------------------
      {
        name: "TIMESTAMP column typed as string should error",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; created_at: string })[]
            >("SELECT id, created_at FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; created_at: Date })[]>("SELECT id, created_at FROM users");
          }
        `,
        errors: [
          {
            messageId: "typeMismatch",
            data: {
              expected: "Date",
              actual: "string",
              column: "created_at",
            },
          },
        ],
      },

      // =================================================================
      // Column Name Errors
      // =================================================================

      // -----------------------------------------------------------------
      // Case: Missing column in type
      // -----------------------------------------------------------------
      {
        name: "Missing column in type should error",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; name: string })[]
            >("SELECT id, name, email FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; name: string; email: string | null })[]>("SELECT id, name, email FROM users");
          }
        `,
        errors: [
          {
            messageId: "missingColumn",
            data: {
              column: "email",
            },
          },
        ],
      },

      // -----------------------------------------------------------------
      // Case: Extra column in type
      // -----------------------------------------------------------------
      {
        name: "Extra column in type not in query should error",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; name: string; email: string | null })[]
            >("SELECT id, name FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; name: string })[]>("SELECT id, name FROM users");
          }
        `,
        errors: [
          {
            messageId: "extraColumn",
            data: {
              column: "email",
            },
          },
        ],
      },

      // -----------------------------------------------------------------
      // Case: Wrong column name (typo)
      // -----------------------------------------------------------------
      {
        name: "Wrong column name (typo) should error",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; username: string })[]
            >("SELECT id, name FROM users");
          }
        `,
        // Overlapping fixes - array output format required
        // First pass: adds missing 'name' column
        // Second pass: removes extra 'username' column
        output: [
          `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; username: string; name: string })[]>("SELECT id, name FROM users");
          }
        `,
          `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; name: string })[]>("SELECT id, name FROM users");
          }
        `,
        ],
        errors: [
          {
            messageId: "missingColumn",
            data: {
              column: "name",
            },
          },
          {
            messageId: "extraColumn",
            data: {
              column: "username",
            },
          },
        ],
      },

      // -----------------------------------------------------------------
      // Case: Alias not used in type
      // -----------------------------------------------------------------
      {
        name: "Column alias not used in type should error",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; name: string })[]
            >("SELECT id AS user_id, name AS user_name FROM users");
          }
        `,
        // Overlapping fixes - array output format required
        // Each pass applies one fix until all columns are corrected
        output: [
          `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; name: string; user_id: number })[]>("SELECT id AS user_id, name AS user_name FROM users");
          }
        `,
          `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; name: string; user_id: number; user_name: string })[]>("SELECT id AS user_id, name AS user_name FROM users");
          }
        `,
          `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { name: string; user_id: number; user_name: string })[]>("SELECT id AS user_id, name AS user_name FROM users");
          }
        `,
          `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { user_id: number; user_name: string })[]>("SELECT id AS user_id, name AS user_name FROM users");
          }
        `,
        ],
        errors: [
          {
            messageId: "missingColumn",
            data: {
              column: "user_id",
            },
          },
          {
            messageId: "missingColumn",
            data: {
              column: "user_name",
            },
          },
          {
            messageId: "extraColumn",
            data: {
              column: "id",
            },
          },
          {
            messageId: "extraColumn",
            data: {
              column: "name",
            },
          },
        ],
      },

      // =================================================================
      // undefined vs null
      // =================================================================

      // -----------------------------------------------------------------
      // Case: Nullable column with undefined instead of null
      // -----------------------------------------------------------------
      {
        name: "Nullable column with undefined instead of null should error",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; email: string | undefined })[]
            >("SELECT id, email FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; email: string | null })[]>("SELECT id, email FROM users");
          }
        `,
        errors: [
          {
            messageId: "typeMismatch",
            data: {
              expected: "string | null",
              actual: "string | undefined",
              column: "email",
            },
          },
        ],
      },
    ],
  });
});

// =============================================================================
// Autofix Tests
// =============================================================================

describe("check-sql: Autofix", () => {
  ruleTester.run("check-sql", checkSqlRule, {
    valid: [],

    invalid: [
      // =================================================================
      // Adding Missing Types
      // =================================================================

      // -----------------------------------------------------------------
      // Case: Add type for simple SELECT
      // -----------------------------------------------------------------
      {
        name: "Autofix adds type annotation for simple SELECT",
        code: `
          import { pool } from './connection';

          async function test() {
            const [rows] = await pool.execute("SELECT id, name FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; name: string })[]>("SELECT id, name FROM users");
          }
        `,
        errors: [{ messageId: "missingType" }],
      },

      // -----------------------------------------------------------------
      // Case: Add type for SELECT with nullable column
      // -----------------------------------------------------------------
      {
        name: "Autofix adds type with | null for nullable columns",
        code: `
          import { pool } from './connection';

          async function test() {
            const [rows] = await pool.execute("SELECT id, email FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; email: string | null })[]>("SELECT id, email FROM users");
          }
        `,
        errors: [{ messageId: "missingType" }],
      },

      // -----------------------------------------------------------------
      // Case: Add type for SELECT with ENUM
      // -----------------------------------------------------------------
      {
        name: "Autofix adds union type for ENUM column",
        code: `
          import { pool } from './connection';

          async function test() {
            const [rows] = await pool.execute("SELECT id, status FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; status: "pending" | "active" | "inactive" })[]>("SELECT id, status FROM users");
          }
        `,
        errors: [{ messageId: "missingType" }],
      },

      // -----------------------------------------------------------------
      // Case: Add type for SELECT with BIGINT
      // -----------------------------------------------------------------
      {
        name: "Autofix adds string type for BIGINT column",
        code: `
          import { pool } from './connection';

          async function test() {
            const [rows] = await pool.execute("SELECT id, view_count FROM posts");
          }
        `,
        output: `
          import { pool } from './connection';
import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; view_count: string })[]>("SELECT id, view_count FROM posts");
          }
        `,
        errors: [{ messageId: "missingType" }],
      },

      // -----------------------------------------------------------------
      // Case: Add type for SELECT with alias
      // -----------------------------------------------------------------
      {
        name: "Autofix uses alias names in type",
        code: `
          import { pool } from './connection';

          async function test() {
            const [rows] = await pool.execute("SELECT id AS user_id, name AS user_name FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { user_id: number; user_name: string })[]>("SELECT id AS user_id, name AS user_name FROM users");
          }
        `,
        errors: [{ messageId: "missingType" }],
      },

      // =================================================================
      // Correcting Wrong Types
      // =================================================================

      // -----------------------------------------------------------------
      // Case: Fix wrong primitive type
      // -----------------------------------------------------------------
      {
        name: "Autofix corrects wrong primitive type",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: string; name: string })[]
            >("SELECT id, name FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; name: string })[]>("SELECT id, name FROM users");
          }
        `,
        errors: [{ messageId: "typeMismatch" }],
      },

      // -----------------------------------------------------------------
      // Case: Fix missing | null
      // -----------------------------------------------------------------
      {
        name: "Autofix adds missing | null for nullable column",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; email: string })[]
            >("SELECT id, email FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; email: string | null })[]>("SELECT id, email FROM users");
          }
        `,
        errors: [{ messageId: "typeMismatch" }],
      },

      // -----------------------------------------------------------------
      // Case: Fix ENUM as string to union type
      // -----------------------------------------------------------------
      {
        name: "Autofix converts string to union type for ENUM",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; status: string })[]
            >("SELECT id, status FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; status: "pending" | "active" | "inactive" })[]>("SELECT id, status FROM users");
          }
        `,
        errors: [{ messageId: "typeMismatch" }],
      },

      // -----------------------------------------------------------------
      // Case: Fix BIGINT as number to string
      // -----------------------------------------------------------------
      {
        name: "Autofix converts number to string for BIGINT",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; view_count: number })[]
            >("SELECT id, view_count FROM posts");
          }
        `,
        output: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; view_count: string })[]>("SELECT id, view_count FROM posts");
          }
        `,
        errors: [{ messageId: "typeMismatch" }],
      },

      // -----------------------------------------------------------------
      // Case: Fix missing column in type
      // -----------------------------------------------------------------
      {
        name: "Autofix adds missing column to type",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; name: string })[]
            >("SELECT id, name, email FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; name: string; email: string | null })[]>("SELECT id, name, email FROM users");
          }
        `,
        errors: [{ messageId: "missingColumn" }],
      },

      // -----------------------------------------------------------------
      // Case: Fix extra column in type
      // -----------------------------------------------------------------
      {
        name: "Autofix removes extra column from type",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; name: string; email: string | null })[]
            >("SELECT id, name FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; name: string })[]>("SELECT id, name FROM users");
          }
        `,
        errors: [{ messageId: "extraColumn" }],
      },

      // =================================================================
      // Import Handling
      // =================================================================

      // -----------------------------------------------------------------
      // Case: Don't duplicate existing import
      // -----------------------------------------------------------------
      {
        name: "Autofix does not duplicate existing RowDataPacket import",
        code: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute("SELECT id, name FROM users");
          }
        `,
        output: `
          import { pool } from './connection';
          import type { RowDataPacket } from 'mysql2/promise';

          async function test() {
            const [rows] = await pool.execute<(RowDataPacket & { id: number; name: string })[]>("SELECT id, name FROM users");
          }
        `,
        errors: [{ messageId: "missingType" }],
      },
    ],
  });
});
