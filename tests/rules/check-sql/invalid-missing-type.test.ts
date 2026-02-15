/**
 * Invalid Cases: Missing Type Annotations
 *
 * These tests verify that the plugin correctly reports errors when
 * type annotations are missing from SQL queries.
 *
 * Error code: missing-type
 * Message: "Missing type annotation for SQL query"
 */

import { RuleTester } from "@typescript-eslint/rule-tester";
import { describe, it } from "vitest";
import { checkSqlRule } from "../../../src/rules/check-sql.js";

const ruleTester = new RuleTester();

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
        errors: [
          {
            messageId: "missingType",
          },
        ],
      },
    ],
  });
});
