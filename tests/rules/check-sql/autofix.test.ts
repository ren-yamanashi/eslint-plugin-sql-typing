/**
 * Autofix Tests
 *
 * These tests verify that the plugin correctly auto-fixes type annotations.
 * The `output` field shows the expected code after autofix.
 */

import { RuleTester } from "@typescript-eslint/rule-tester";
import { describe, it } from "vitest";
import { checkSqlRule } from "../../../src/rules/check-sql.js";

const ruleTester = new RuleTester();

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
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; name: string })[]
            >("SELECT id, name FROM users");
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
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; email: string | null })[]
            >("SELECT id, email FROM users");
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
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; status: "pending" | "active" | "inactive" })[]
            >("SELECT id, status FROM users");
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
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; view_count: string })[]
            >("SELECT id, view_count FROM posts");
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
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; name: string; email: string | null })[]
            >("SELECT id, name, email FROM users");
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
            const [rows] = await pool.execute<
              (RowDataPacket & { id: number; name: string })[]
            >("SELECT id, name FROM users");
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
