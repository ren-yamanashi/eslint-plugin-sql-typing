/**
 * Edge Cases
 *
 * These examples demonstrate edge cases and advanced SQL patterns.
 * Some are valid, some should produce errors depending on implementation scope.
 */

import type { RowDataPacket } from "mysql2/promise";
import { pool } from "./connection.js";

// =============================================================================
// SELECT * Cases
// =============================================================================

/**
 * Case 1: SELECT * from single table
 *
 * The plugin should infer all columns from the users table.
 * This is a valid case if the type matches all columns.
 */
export async function selectStarFromSingleTable() {
  const [rows] =
    await pool.execute<
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

  return rows;
}

/**
 * Case 2: SELECT * without type annotation
 *
 * Error: missing-type
 * The plugin should infer all columns from the table schema.
 */
export async function selectStarMissingType() {
  const [rows] = await pool.execute("SELECT * FROM users");
  //                   ^^^^^^^ Error: Missing type annotation for SQL query

  return rows;
}

// =============================================================================
// JOIN Cases
// =============================================================================

/**
 * Case 3: Simple INNER JOIN with explicit columns
 *
 * Valid case with correct type annotations.
 */
export async function validInnerJoin() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      post_id: number;
      title: string;
      author_name: string;
    })[]
  >(`
    SELECT p.id AS post_id, p.title, u.name AS author_name
    FROM posts p
    INNER JOIN users u ON p.user_id = u.id
  `);

  return rows;
}

/**
 * Case 4: JOIN with column name collision (without nestTables)
 *
 * When both tables have 'id' column and no alias is used,
 * the behavior depends on mysql2 configuration.
 */
export async function joinWithColumnCollision() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number; // This might be ambiguous - last one wins?
      title: string;
      name: string;
    })[]
  >(`
    SELECT p.id, p.title, u.name
    FROM posts p
    INNER JOIN users u ON p.user_id = u.id
  `);

  return rows;
}

/**
 * Case 5: LEFT JOIN with nullable result columns
 *
 * Columns from the right table should be nullable in LEFT JOIN.
 */
export async function leftJoinNullableColumns() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      user_id: number;
      user_name: string;
      post_title: string | null; // nullable because LEFT JOIN
    })[]
  >(`
    SELECT u.id AS user_id, u.name AS user_name, p.title AS post_title
    FROM users u
    LEFT JOIN posts p ON u.id = p.user_id
  `);

  return rows;
}

// =============================================================================
// nestTables Option Cases
// =============================================================================

/**
 * Case 6: Query with nestTables: true
 *
 * When nestTables is enabled, results are nested by table name.
 * The type should reflect this nested structure.
 */
export async function queryWithNestTables() {
  const [rows] = await pool.query<
    (RowDataPacket & {
      users: {
        id: number;
        name: string;
      };
      posts: {
        id: number;
        title: string;
      };
    })[]
  >({
    sql: `
      SELECT u.id, u.name, p.id, p.title
      FROM users u
      INNER JOIN posts p ON u.id = p.user_id
    `,
    nestTables: true,
  });

  return rows;
}

/**
 * Case 7: nestTables with wrong flat type (should error)
 *
 * Error: type-mismatch
 * When nestTables is true, flat types are incorrect.
 */
export async function nestTablesWrongFlatType() {
  const [rows] = await pool.query<
    (RowDataPacket & {
      // Wrong: should be nested
      id: number;
      name: string;
      title: string;
    })[]
  >({
    sql: `
      SELECT u.id, u.name, p.title
      FROM users u
      INNER JOIN posts p ON u.id = p.user_id
    `,
    nestTables: true,
  });

  return rows;
}

// =============================================================================
// rowsAsArray Option Cases
// =============================================================================

/**
 * Case 8: Query with rowsAsArray: true
 *
 * When rowsAsArray is enabled, results are returned as arrays instead of objects.
 * The type should be a tuple type.
 */
export async function queryWithRowsAsArray() {
  const [rows] = await pool.query<[number, string, string | null][]>({
    sql: "SELECT id, name, email FROM users",
    rowsAsArray: true,
  });

  return rows;
}

/**
 * Case 9: rowsAsArray with wrong object type (should error)
 *
 * Error: type-mismatch
 * When rowsAsArray is true, object types are incorrect.
 */
export async function rowsAsArrayWrongObjectType() {
  const [rows] = await pool.query<
    (RowDataPacket & {
      // Wrong: should be tuple type
      id: number;
      name: string;
    })[]
  >({
    sql: "SELECT id, name FROM users",
    rowsAsArray: true,
  });

  return rows;
}

// =============================================================================
// Aggregate Function Cases
// =============================================================================

/**
 * Case 10: COUNT aggregate function
 *
 * COUNT returns BIGINT in MySQL, which should be string.
 */
export async function aggregateCount() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      total: string; // COUNT returns BIGINT
    })[]
  >("SELECT COUNT(*) AS total FROM users");

  return rows;
}

/**
 * Case 11: SUM aggregate function
 *
 * SUM returns DECIMAL for decimal columns.
 */
export async function aggregateSum() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      total_balance: string; // SUM of DECIMAL
    })[]
  >("SELECT SUM(balance) AS total_balance FROM users");

  return rows;
}

/**
 * Case 12: GROUP BY with aggregate
 */
export async function groupByWithAggregate() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      status: "pending" | "active" | "inactive";
      count: string;
    })[]
  >("SELECT status, COUNT(*) AS count FROM users GROUP BY status");

  return rows;
}

// =============================================================================
// Subquery Cases
// =============================================================================

/**
 * Case 13: Subquery in SELECT
 *
 * The subquery result type depends on what's selected.
 */
export async function subqueryInSelect() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      name: string;
      post_count: string; // COUNT returns BIGINT
    })[]
  >(`
    SELECT
      u.id,
      u.name,
      (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id) AS post_count
    FROM users u
  `);

  return rows;
}

// =============================================================================
// Expression Cases
// =============================================================================

/**
 * Case 14: Arithmetic expressions
 *
 * The result type of arithmetic expressions depends on operand types.
 */
export async function arithmeticExpression() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      doubled_age: number | null; // age * 2, null if age is null
    })[]
  >("SELECT id, age * 2 AS doubled_age FROM users");

  return rows;
}

/**
 * Case 15: String concatenation with CONCAT
 */
export async function stringConcat() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      full_info: string | null; // CONCAT with nullable column
    })[]
  >("SELECT id, CONCAT(name, ' - ', COALESCE(email, 'N/A')) AS full_info FROM users");

  return rows;
}

// =============================================================================
// CASE Expression Cases
// =============================================================================

/**
 * Case 16: CASE expression
 */
export async function caseExpression() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      status_label: string;
    })[]
  >(`
    SELECT
      id,
      CASE status
        WHEN 'active' THEN 'Active User'
        WHEN 'pending' THEN 'Pending Approval'
        ELSE 'Inactive'
      END AS status_label
    FROM users
  `);

  return rows;
}

// =============================================================================
// Template Literal Cases
// =============================================================================

/**
 * Case 17: Template literal with static SQL
 *
 * Simple template literal without interpolation should work.
 */
export async function templateLiteralStatic() {
  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      name: string;
    })[]
  >(`SELECT id, name FROM users`);

  return rows;
}

/**
 * Case 18: Template literal with dynamic parts (out of scope for v0.1.0)
 *
 * Template literals with interpolation are harder to analyze statically.
 * This might be skipped or produce a warning in v0.1.0.
 */
export async function templateLiteralDynamic(tableName: string) {
  // This case might not be supported in v0.1.0
  const [rows] = await pool.execute(`SELECT id, name FROM ${tableName}`);

  return rows;
}
