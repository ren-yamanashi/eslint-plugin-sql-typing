/**
 * Valid Cases: Simple SELECT Queries
 *
 * These tests verify that the plugin correctly accepts valid type annotations
 * for simple SELECT queries without complex features like JOINs or aggregates.
 */

import { RuleTester } from "@typescript-eslint/rule-tester";
import { describe, it } from "vitest";
import { checkSqlRule } from "../../../src/rules/check-sql.js";

const ruleTester = new RuleTester();

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
