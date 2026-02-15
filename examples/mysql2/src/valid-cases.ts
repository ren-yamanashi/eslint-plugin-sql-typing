/**
 * Valid Cases - No ESLint errors expected
 *
 * These examples demonstrate correct type annotations that match the database schema.
 * The plugin should NOT report any errors for these cases.
 */

import type { RowDataPacket } from "mysql2/promise";
import { pool } from "./connection.js";

// =============================================================================
// Case 1: Simple SELECT with correct types
// =============================================================================
export async function validSimpleSelect() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      name: string;
      email: string | null;
    })[]
  >("SELECT id, name, email FROM users");

  return rows;
}

// =============================================================================
// Case 2: SELECT with nullable columns
// =============================================================================
export async function validNullableColumns() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      email: string | null;
      age: number | null;
      updated_at: Date | null;
    })[]
  >("SELECT id, email, age, updated_at FROM users");

  return rows;
}

// =============================================================================
// Case 3: SELECT with ENUM type (union type)
// =============================================================================
export async function validEnumType() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      name: string;
      status: "pending" | "active" | "inactive";
    })[]
  >("SELECT id, name, status FROM users");

  return rows;
}

// =============================================================================
// Case 4: SELECT with BIGINT (should be string)
// =============================================================================
export async function validBigIntType() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      view_count: string; // BIGINT is string in mysql2
    })[]
  >("SELECT id, view_count FROM posts");

  return rows;
}

// =============================================================================
// Case 5: SELECT with DECIMAL (should be string)
// =============================================================================
export async function validDecimalType() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      balance: string; // DECIMAL is string for precision
    })[]
  >("SELECT id, balance FROM users");

  return rows;
}

// =============================================================================
// Case 6: SELECT with DATE/TIMESTAMP types
// =============================================================================
export async function validDateTypes() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      created_at: Date;
      updated_at: Date | null;
    })[]
  >("SELECT id, created_at, updated_at FROM users");

  return rows;
}

// =============================================================================
// Case 7: SELECT with column alias
// =============================================================================
export async function validColumnAlias() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      user_id: number;
      user_name: string;
    })[]
  >("SELECT id AS user_id, name AS user_name FROM users");

  return rows;
}

// =============================================================================
// Case 8: SELECT with WHERE clause (same return type)
// =============================================================================
export async function validWithWhereClause() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      name: string;
      status: "pending" | "active" | "inactive";
    })[]
  >("SELECT id, name, status FROM users WHERE status = 'active'");

  return rows;
}

// =============================================================================
// Case 9: SELECT with LIMIT (same return type)
// =============================================================================
export async function validWithLimit() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      name: string;
    })[]
  >("SELECT id, name FROM users LIMIT 10");

  return rows;
}

// =============================================================================
// Case 10: SELECT with ORDER BY (same return type)
// =============================================================================
export async function validWithOrderBy() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      name: string;
      created_at: Date;
    })[]
  >("SELECT id, name, created_at FROM users ORDER BY created_at DESC");

  return rows;
}
