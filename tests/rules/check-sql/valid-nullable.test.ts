/**
 * Valid Cases: Nullable Column Handling
 *
 * These tests verify that the plugin correctly handles nullable columns.
 * Nullable columns should be typed as `T | null`.
 */

import { RuleTester } from "@typescript-eslint/rule-tester";
import { describe, it } from "vitest";
import { checkSqlRule } from "../../../src/rules/check-sql.js";

const ruleTester = new RuleTester();

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
              (RowDataPacket & { id: number; metadata: unknown })[]
            >("SELECT id, metadata FROM users");
          }
        `,
      },
    ],

    invalid: [],
  });
});
