/**
 * Invalid Cases - Wrong Type Annotations
 *
 * These examples demonstrate cases where type annotations exist but are incorrect.
 * The plugin SHOULD report `type-mismatch` errors for these cases.
 *
 * Expected behavior:
 * - ESLint reports an error: "Type mismatch: expected {...}, got {...}"
 * - Autofix corrects the type annotation to match the database schema
 */

import type { RowDataPacket } from "mysql2/promise";
import { pool } from "./connection.js";

// =============================================================================
// Case 1: Wrong column type (number instead of string)
// =============================================================================
// Error: type-mismatch
// Expected: { id: number; name: string }
// Got: { id: string; name: string }
export async function wrongTypeNumberAsString() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: string; // Wrong: should be number
      name: string;
    })[]
  >("SELECT id, name FROM users");

  return rows;
}

// =============================================================================
// Case 2: Missing nullable annotation
// =============================================================================
// Error: type-mismatch
// Expected: { id: number; email: string | null }
// Got: { id: number; email: string }
export async function wrongTypeMissingNull() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      email: string; // Wrong: should be string | null
    })[]
  >("SELECT id, email FROM users");

  return rows;
}

// =============================================================================
// Case 3: ENUM type as plain string
// =============================================================================
// Error: type-mismatch
// Expected: { id: number; status: "pending" | "active" | "inactive" }
// Got: { id: number; status: string }
export async function wrongTypeEnumAsString() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      status: string; // Wrong: should be "pending" | "active" | "inactive"
    })[]
  >("SELECT id, status FROM users");

  return rows;
}

// =============================================================================
// Case 4: BIGINT as number instead of string
// =============================================================================
// Error: type-mismatch
// Expected: { id: number; view_count: string }
// Got: { id: number; view_count: number }
export async function wrongTypeBigIntAsNumber() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      view_count: number; // Wrong: BIGINT should be string
    })[]
  >("SELECT id, view_count FROM posts");

  return rows;
}

// =============================================================================
// Case 5: DECIMAL as number instead of string
// =============================================================================
// Error: type-mismatch
// Expected: { id: number; balance: string }
// Got: { id: number; balance: number }
export async function wrongTypeDecimalAsNumber() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      balance: number; // Wrong: DECIMAL should be string for precision
    })[]
  >("SELECT id, balance FROM users");

  return rows;
}

// =============================================================================
// Case 6: DATE as string instead of Date
// =============================================================================
// Error: type-mismatch
// Expected: { id: number; created_at: Date }
// Got: { id: number; created_at: string }
export async function wrongTypeDateAsString() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      created_at: string; // Wrong: should be Date
    })[]
  >("SELECT id, created_at FROM users");

  return rows;
}

// =============================================================================
// Case 7: Missing column in type
// =============================================================================
// Error: type-mismatch
// Expected: { id: number; name: string; email: string | null }
// Got: { id: number; name: string }
export async function wrongTypeMissingColumn() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      name: string;
      // Missing: email: string | null
    })[]
  >("SELECT id, name, email FROM users");

  return rows;
}

// =============================================================================
// Case 8: Extra column in type (not in query)
// =============================================================================
// Error: type-mismatch
// Expected: { id: number; name: string }
// Got: { id: number; name: string; email: string | null }
export async function wrongTypeExtraColumn() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      name: string;
      email: string | null; // Extra: not in SELECT
    })[]
  >("SELECT id, name FROM users");

  return rows;
}

// =============================================================================
// Case 9: Wrong column name (typo)
// =============================================================================
// Error: type-mismatch
// Expected: { id: number; name: string }
// Got: { id: number; username: string }
export async function wrongTypeColumnNameTypo() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      username: string; // Wrong: should be name
    })[]
  >("SELECT id, name FROM users");

  return rows;
}

// =============================================================================
// Case 10: Wrong alias in type
// =============================================================================
// Error: type-mismatch
// Expected: { user_id: number; user_name: string }
// Got: { id: number; name: string }
export async function wrongTypeWrongAlias() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number; // Wrong: should be user_id (alias used)
      name: string; // Wrong: should be user_name (alias used)
    })[]
  >("SELECT id AS user_id, name AS user_name FROM users");

  return rows;
}

// =============================================================================
// Case 11: Nullable column marked as non-null union with undefined
// =============================================================================
// Error: type-mismatch
// Expected: { id: number; email: string | null }
// Got: { id: number; email: string | undefined }
export async function wrongTypeUndefinedInsteadOfNull() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      email: string | undefined; // Wrong: mysql2 returns null, not undefined
    })[]
  >("SELECT id, email FROM users");

  return rows;
}

// =============================================================================
// Case 12: Incorrect ENUM values
// =============================================================================
// Error: type-mismatch
// Expected: { status: "pending" | "active" | "inactive" }
// Got: { status: "pending" | "active" }
export async function wrongTypeIncompleteEnum() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      status: "pending" | "active"; // Wrong: missing "inactive"
    })[]
  >("SELECT id, status FROM users");

  return rows;
}
