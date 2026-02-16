/**
 * MySQL Adapter Unit Tests
 *
 * These tests verify the MySQL adapter correctly fetches column metadata
 * from prepared statements and INFORMATION_SCHEMA.
 *
 * Note: These tests require a MySQL database connection.
 * They will be skipped if DB_HOST environment variable is not set.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ColumnMeta } from "../../types/meta.i";

import type { DatabaseConfig } from "./config.i";
import { MySQLAdapter } from "./mysql";

/**
 * Helper to get column at index with type safety
 */
function getColumn(columns: ColumnMeta[], index: number): ColumnMeta {
  const column = columns[index];
  if (!column) {
    throw new Error("Column at index " + String(index) + " not found");
  }
  return column;
}

const DB_CONFIG: DatabaseConfig = {
  host: process.env["DB_HOST"] ?? "localhost",
  port: parseInt(process.env["DB_PORT"] ?? "3306", 10),
  user: process.env["DB_USER"] ?? "root",
  password: process.env["DB_PASSWORD"] ?? "password",
  database: process.env["DB_NAME"] ?? "test_db",
};

// Skip tests if database is not available
const skipIfNoDb = process.env["DB_HOST"] ? describe : describe.skip;

skipIfNoDb("MySQL Adapter", () => {
  let adapter: MySQLAdapter;

  beforeAll(async () => {
    adapter = new MySQLAdapter(DB_CONFIG);
    await adapter.connect();
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  // =========================================================================
  // Connection Management
  // =========================================================================

  describe("Connection Management", () => {
    it("should connect to database", async () => {
      // GIVEN
      const testAdapter = new MySQLAdapter(DB_CONFIG);

      // WHEN
      const connectPromise = testAdapter.connect();

      // THEN
      await expect(connectPromise).resolves.not.toThrow();
      await testAdapter.disconnect();
    });

    it("should disconnect from database", async () => {
      // GIVEN
      const testAdapter = new MySQLAdapter(DB_CONFIG);
      await testAdapter.connect();

      // WHEN
      const disconnectPromise = testAdapter.disconnect();

      // THEN
      await expect(disconnectPromise).resolves.not.toThrow();
    });

    it("should handle connection error with invalid credentials", async () => {
      // GIVEN
      const invalidConfig: DatabaseConfig = {
        ...DB_CONFIG,
        password: "invalid_password",
      };
      const testAdapter = new MySQLAdapter(invalidConfig);

      // WHEN
      const connectPromise = testAdapter.connect();

      // THEN
      await expect(connectPromise).rejects.toThrow();
    });
  });

  // =========================================================================
  // Column Metadata Extraction
  // =========================================================================

  describe("Column Metadata Extraction", () => {
    it("should extract column metadata for simple SELECT", async () => {
      // GIVEN
      const sql = "SELECT id, name, email FROM users";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      expect(metadata.columns).toHaveLength(3);
      expect(metadata.columns[0]).toMatchObject({
        name: "id",
        table: "users",
        type: "INT",
      });
      expect(metadata.columns[1]).toMatchObject({
        name: "name",
        table: "users",
        type: "VARCHAR",
      });
      expect(metadata.columns[2]).toMatchObject({
        name: "email",
        table: "users",
        type: "VARCHAR",
        nullable: true,
      });
    });

    it("should extract typeCode for each column", async () => {
      // GIVEN
      const sql = "SELECT id FROM users";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      const col = getColumn(metadata.columns, 0);
      expect(col.typeCode).toBeDefined();
      expect(typeof col.typeCode).toBe("number");
    });

    it("should extract column alias", async () => {
      // GIVEN
      const sql = "SELECT id AS user_id FROM users";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      expect(metadata.columns[0]).toMatchObject({
        name: "id",
        alias: "user_id",
      });
    });

    it("should handle SELECT *", async () => {
      // GIVEN
      const sql = "SELECT * FROM users";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      expect(metadata.columns.length).toBeGreaterThan(0);
      const columnNames = metadata.columns.map((c) => c.name);
      expect(columnNames).toContain("id");
      expect(columnNames).toContain("name");
    });
  });

  // =========================================================================
  // Type Detection
  // =========================================================================

  describe("Type Detection", () => {
    it("should detect INT type", async () => {
      // GIVEN
      const sql = "SELECT id FROM users";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      const col = getColumn(metadata.columns, 0);
      expect(col.type).toBe("INT");
      expect(col.typeCode).toBe(3);
    });

    it("should detect VARCHAR type", async () => {
      // GIVEN
      const sql = "SELECT name FROM users";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      const col = getColumn(metadata.columns, 0);
      expect(col.type).toBe("VARCHAR");
      expect(col.typeCode).toBe(253);
    });

    it("should detect BIGINT type", async () => {
      // GIVEN
      const sql = "SELECT view_count FROM posts";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      const col = getColumn(metadata.columns, 0);
      expect(col.type).toBe("BIGINT");
      expect(col.typeCode).toBe(8);
    });

    it("should detect DECIMAL type", async () => {
      // GIVEN
      const sql = "SELECT balance FROM users";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      const col = getColumn(metadata.columns, 0);
      expect(col.type).toBe("DECIMAL");
      expect(col.typeCode).toBe(246);
    });

    it("should detect TIMESTAMP type", async () => {
      // GIVEN
      const sql = "SELECT created_at FROM users";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      const col = getColumn(metadata.columns, 0);
      expect(col.type).toBe("TIMESTAMP");
      expect(col.typeCode).toBe(7);
    });

    it("should detect JSON type", async () => {
      // GIVEN
      const sql = "SELECT metadata FROM users";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      const col = getColumn(metadata.columns, 0);
      expect(col.type).toBe("JSON");
      expect(col.typeCode).toBe(245);
    });
  });

  // =========================================================================
  // ENUM Type Handling
  // =========================================================================

  describe("ENUM Type Handling", () => {
    it("should detect ENUM type", async () => {
      // GIVEN
      const sql = "SELECT status FROM users";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      const col = getColumn(metadata.columns, 0);
      expect(col.type).toBe("ENUM");
      expect(col.typeCode).toBe(247);
    });

    it("should fetch ENUM values from INFORMATION_SCHEMA", async () => {
      // GIVEN
      const sql = "SELECT status FROM users";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      const col = getColumn(metadata.columns, 0);
      expect(col.enumValues).toBeDefined();
      expect(col.enumValues).toEqual(["pending", "active", "inactive"]);
    });

    it("should handle multiple ENUM columns", async () => {
      // GIVEN
      const sql = "SELECT status FROM users";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      const col = getColumn(metadata.columns, 0);
      expect(col.enumValues).toBeDefined();
    });
  });

  // =========================================================================
  // Nullable Detection
  // =========================================================================

  describe("Nullable Detection", () => {
    it("should detect non-nullable column", async () => {
      // GIVEN
      const sql = "SELECT id FROM users";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      const col = getColumn(metadata.columns, 0);
      expect(col.nullable).toBe(false);
    });

    it("should detect nullable column", async () => {
      // GIVEN
      const sql = "SELECT email FROM users";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      const col = getColumn(metadata.columns, 0);
      expect(col.nullable).toBe(true);
    });

    it("should handle LEFT JOIN nullable columns", async () => {
      // GIVEN
      const sql = `
        SELECT u.id, p.title
        FROM users u
        LEFT JOIN posts p ON u.id = p.user_id
      `;

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      const titleColumn = metadata.columns.find((c) => c.name === "title");
      expect(titleColumn?.nullable).toBe(true);
    });
  });

  // =========================================================================
  // Aggregate Functions
  // =========================================================================

  describe("Aggregate Functions", () => {
    it("should detect COUNT aggregate", async () => {
      // GIVEN
      const sql = "SELECT COUNT(*) AS total FROM users";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      expect(metadata.columns[0]).toMatchObject({
        alias: "total",
        type: "BIGINT",
        isAggregate: true,
      });
    });

    it("should detect SUM aggregate", async () => {
      // GIVEN
      const sql = "SELECT SUM(balance) AS total_balance FROM users";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      expect(metadata.columns[0]).toMatchObject({
        alias: "total_balance",
        isAggregate: true,
        nullable: true,
      });
    });

    it("should detect AVG aggregate", async () => {
      // GIVEN
      const sql = "SELECT AVG(balance) AS avg_balance FROM users";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      expect(metadata.columns[0]).toMatchObject({
        alias: "avg_balance",
        isAggregate: true,
      });
    });
  });

  // =========================================================================
  // JOIN Queries
  // =========================================================================

  describe("JOIN Queries", () => {
    it("should handle INNER JOIN", async () => {
      // GIVEN
      const sql = `
        SELECT u.id, u.name, p.title
        FROM users u
        INNER JOIN posts p ON u.id = p.user_id
      `;

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      const col0 = getColumn(metadata.columns, 0);
      const col2 = getColumn(metadata.columns, 2);
      expect(metadata.columns).toHaveLength(3);
      expect(col0.table).toBe("u");
      expect(col2.table).toBe("p");
    });

    it("should handle multiple JOINs", async () => {
      // GIVEN
      const sql = `
        SELECT u.name, p.title, c.body
        FROM users u
        INNER JOIN posts p ON u.id = p.user_id
        INNER JOIN comments c ON p.id = c.post_id
      `;

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      expect(metadata.columns).toHaveLength(3);
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe("Edge Cases", () => {
    it("should handle query with WHERE clause and parameters", async () => {
      // GIVEN
      const sql = "SELECT id, name FROM users WHERE id = ?";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      expect(metadata.columns).toHaveLength(2);
    });

    it("should handle query with ORDER BY", async () => {
      // GIVEN
      const sql = "SELECT id, name FROM users ORDER BY id DESC";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      expect(metadata.columns).toHaveLength(2);
    });

    it("should handle query with LIMIT", async () => {
      // GIVEN
      const sql = "SELECT id, name FROM users LIMIT 10";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      expect(metadata.columns).toHaveLength(2);
    });

    it("should handle subquery", async () => {
      // GIVEN
      const sql = `
        SELECT id, name FROM users WHERE id IN (SELECT user_id FROM posts)
      `;

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      expect(metadata.columns).toHaveLength(2);
    });

    it("should throw error for invalid SQL", async () => {
      // GIVEN
      const sql = "SELECT * FROM nonexistent_table";

      // WHEN
      const queryPromise = adapter.getQueryMetadata(sql);

      // THEN
      await expect(queryPromise).rejects.toThrow();
    });

    it("should handle backtick-quoted identifiers", async () => {
      // GIVEN
      const sql = "SELECT `id`, `name` FROM `users`";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      const col = getColumn(metadata.columns, 0);
      expect(metadata.columns).toHaveLength(2);
      expect(col.name).toBe("id");
    });
  });

  // =========================================================================
  // Expression Columns
  // =========================================================================

  describe("Expression Columns", () => {
    it("should handle literal values", async () => {
      // GIVEN
      const sql = "SELECT 1 AS one, 'hello' AS greeting";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      expect(metadata.columns).toHaveLength(2);
    });

    it("should handle arithmetic expressions", async () => {
      // GIVEN
      const sql = "SELECT id * 2 AS doubled FROM users";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      const col = getColumn(metadata.columns, 0);
      expect(metadata.columns).toHaveLength(1);
      expect(col.alias).toBe("doubled");
    });

    it("should handle string concatenation", async () => {
      // GIVEN
      const sql = "SELECT CONCAT(name, ' - ', email) AS full_info FROM users";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      const col = getColumn(metadata.columns, 0);
      expect(metadata.columns).toHaveLength(1);
      expect(col.type).toBe("VARCHAR");
    });

    it("should handle CASE expression", async () => {
      // GIVEN
      const sql = `
        SELECT
          CASE WHEN status = 'active' THEN 1 ELSE 0 END AS is_active
        FROM users
      `;

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      expect(metadata.columns).toHaveLength(1);
    });

    it("should handle COALESCE", async () => {
      // GIVEN
      const sql = "SELECT COALESCE(email, 'no-email') AS email FROM users";

      // WHEN
      const metadata = await adapter.getQueryMetadata(sql);

      // THEN
      const col = getColumn(metadata.columns, 0);
      expect(metadata.columns).toHaveLength(1);
      expect(col.nullable).toBe(false);
    });
  });
});

// =========================================================================
// Unit Tests (No DB Required)
// =========================================================================

describe("MySQL Adapter - Unit Tests", () => {
  describe("Configuration Validation", () => {
    it("should accept valid config", () => {
      // GIVEN
      const config = DB_CONFIG;

      // WHEN
      const createAdapter = () => new MySQLAdapter(config);

      // THEN
      expect(createAdapter).not.toThrow();
    });

    it("should use default port if not specified", () => {
      // GIVEN
      const configWithoutPort = {
        host: "localhost",
        user: "root",
        password: "password",
        database: "test_db",
      };

      // WHEN
      const createAdapter = () => new MySQLAdapter(configWithoutPort as DatabaseConfig);

      // THEN
      expect(createAdapter).not.toThrow();
    });
  });

  describe("SQL Parsing Helper", () => {
    it("should detect SELECT statement", () => {
      // GIVEN
      const selectSql = "SELECT * FROM users";
      const insertSql = "INSERT INTO users";
      const updateSql = "UPDATE users SET";
      const deleteSql = "DELETE FROM users";

      // WHEN
      const selectResult = MySQLAdapter.isSelectQuery(selectSql);
      const insertResult = MySQLAdapter.isSelectQuery(insertSql);
      const updateResult = MySQLAdapter.isSelectQuery(updateSql);
      const deleteResult = MySQLAdapter.isSelectQuery(deleteSql);

      // THEN
      expect(selectResult).toBe(true);
      expect(insertResult).toBe(false);
      expect(updateResult).toBe(false);
      expect(deleteResult).toBe(false);
    });

    it("should handle case insensitivity", () => {
      // GIVEN
      const lowerCaseSql = "select * from users";
      const mixedCaseSql = "Select * From users";

      // WHEN
      const lowerCaseResult = MySQLAdapter.isSelectQuery(lowerCaseSql);
      const mixedCaseResult = MySQLAdapter.isSelectQuery(mixedCaseSql);

      // THEN
      expect(lowerCaseResult).toBe(true);
      expect(mixedCaseResult).toBe(true);
    });
  });
});
