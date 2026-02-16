/**
 * Invalid Cases - Missing Type Annotations
 *
 * These examples demonstrate cases where type annotations are missing.
 * The plugin SHOULD report `missing-type` errors for these cases.
 *
 * Expected behavior:
 * - ESLint reports an error: "Missing type annotation for SQL query"
 * - Autofix adds the correct type annotation based on the database schema
 */

import { pool } from "./connection.js";

// =============================================================================
// Case 1: Simple SELECT without type annotation
// =============================================================================
// Error: missing-type
// Autofix should add: <(RowDataPacket & { id: number; name: string; email: string | null })[]>
export async function missingTypeSimpleSelect() {
  const [rows] = await pool.execute("SELECT id, name, email FROM users");
  //                   ^^^^^^^ Error: Missing type annotation for SQL query

  return rows;
}

// =============================================================================
// Case 2: SELECT with ENUM without type annotation
// =============================================================================
// Error: missing-type
// Autofix should add: <(RowDataPacket & { id: number; status: "pending" | "active" | "inactive" })[]>
export async function missingTypeWithEnum() {
  const [rows] = await pool.execute("SELECT id, status FROM users");
  //                   ^^^^^^^ Error: Missing type annotation for SQL query

  return rows;
}

// =============================================================================
// Case 3: SELECT with nullable columns without type annotation
// =============================================================================
// Error: missing-type
// Autofix should add: <(RowDataPacket & { id: number; email: string | null; age: number | null })[]>
export async function missingTypeNullableColumns() {
  const [rows] = await pool.execute("SELECT id, email, age FROM users");
  //                   ^^^^^^^ Error: Missing type annotation for SQL query

  return rows;
}

// =============================================================================
// Case 4: SELECT with BIGINT without type annotation
// =============================================================================
// Error: missing-type
// Autofix should add: <(RowDataPacket & { id: number; view_count: string })[]>
export async function missingTypeBigInt() {
  const [rows] = await pool.execute("SELECT id, view_count FROM posts");
  //                   ^^^^^^^ Error: Missing type annotation for SQL query

  return rows;
}

// =============================================================================
// Case 5: SELECT with DECIMAL without type annotation
// =============================================================================
// Error: missing-type
// Autofix should add: <(RowDataPacket & { id: number; balance: string })[]>
export async function missingTypeDecimal() {
  const [rows] = await pool.execute("SELECT id, balance FROM users");
  //                   ^^^^^^^ Error: Missing type annotation for SQL query

  return rows;
}

// =============================================================================
// Case 6: SELECT with DATE/TIMESTAMP without type annotation
// =============================================================================
// Error: missing-type
// Autofix should add: <(RowDataPacket & { id: number; created_at: Date; updated_at: Date | null })[]>
export async function missingTypeDateTypes() {
  const [rows] = await pool.execute("SELECT id, created_at, updated_at FROM users");
  //                   ^^^^^^^ Error: Missing type annotation for SQL query

  return rows;
}

// =============================================================================
// Case 7: SELECT with alias without type annotation
// =============================================================================
// Error: missing-type
// Autofix should add: <(RowDataPacket & { user_id: number; user_name: string })[]>
export async function missingTypeWithAlias() {
  const [rows] = await pool.execute("SELECT id AS user_id, name AS user_name FROM users");
  //                   ^^^^^^^ Error: Missing type annotation for SQL query

  return rows;
}

// =============================================================================
// Case 8: Using query() instead of execute()
// =============================================================================
// Error: missing-type
// Autofix should add: <(RowDataPacket & { id: number; name: string })[]>
export async function missingTypeWithQuery() {
  const [rows] = await pool.query("SELECT id, name FROM users");
  //                   ^^^^^ Error: Missing type annotation for SQL query

  return rows;
}

// =============================================================================
// Case 9: Multiple queries in same function without type annotations
// =============================================================================
export async function missingTypeMultipleQueries() {
  // Error: missing-type
  const [users] = await pool.execute("SELECT id, name FROM users");
  //                    ^^^^^^^ Error: Missing type annotation for SQL query

  // Error: missing-type
  const [posts] = await pool.execute("SELECT id, title FROM posts");
  //                    ^^^^^^^ Error: Missing type annotation for SQL query

  return { users, posts };
}
