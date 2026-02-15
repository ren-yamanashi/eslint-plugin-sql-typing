/**
 * Valid Cases: Special MySQL Types
 *
 * These tests verify that the plugin correctly handles special MySQL types
 * such as ENUM, BIGINT, DECIMAL, DATE/TIMESTAMP, and JSON.
 */

import { RuleTester } from "@typescript-eslint/rule-tester";
import { describe, it } from "vitest";
import { checkSqlRule } from "../../../src/rules/check-sql.js";

const ruleTester = new RuleTester();

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
              (RowDataPacket & { id: number; metadata: unknown })[]
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
                metadata: unknown;
              })[]
            >("SELECT * FROM users");
          }
        `,
      },
    ],

    invalid: [],
  });
});
