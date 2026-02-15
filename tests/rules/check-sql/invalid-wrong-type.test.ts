/**
 * Invalid Cases: Wrong Type Annotations
 *
 * These tests verify that the plugin correctly reports errors when
 * type annotations exist but are incorrect.
 *
 * Error code: typeMismatch
 * Message: "Type mismatch: expected {...}, got {...}"
 */

import { RuleTester } from "@typescript-eslint/rule-tester";
import { describe, it } from "vitest";
import { checkSqlRule } from "../../../src/rules/check-sql.js";

const ruleTester = new RuleTester();

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
