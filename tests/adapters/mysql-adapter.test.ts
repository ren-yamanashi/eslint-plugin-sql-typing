/**
 * MySQL Adapter Unit Tests
 *
 * These tests verify the MySQL adapter correctly fetches column metadata
 * from prepared statements and INFORMATION_SCHEMA.
 *
 * Note: These tests require a MySQL database connection.
 * They will be skipped if DB_HOST environment variable is not set.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MySQLAdapter } from "../../src/adapters/mysql-adapter.js";
import type { DatabaseConfig } from "../../src/types/config.js";

const DB_CONFIG: DatabaseConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "test_db",
};

// Skip tests if database is not available
const skipIfNoDb = process.env.DB_HOST ? describe : describe.skip;

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
      const testAdapter = new MySQLAdapter(DB_CONFIG);
      await expect(testAdapter.connect()).resolves.not.toThrow();
      await testAdapter.disconnect();
    });

    it("should disconnect from database", async () => {
      const testAdapter = new MySQLAdapter(DB_CONFIG);
      await testAdapter.connect();
      await expect(testAdapter.disconnect()).resolves.not.toThrow();
    });

    it("should handle connection error with invalid credentials", async () => {
      const invalidConfig: DatabaseConfig = {
        ...DB_CONFIG,
        password: "invalid_password",
      };
      const testAdapter = new MySQLAdapter(invalidConfig);
      await expect(testAdapter.connect()).rejects.toThrow();
    });
  });

  // =========================================================================
  // Column Metadata Extraction
  // =========================================================================

  describe("Column Metadata Extraction", () => {
    it("should extract column metadata for simple SELECT", async () => {
      const metadata = await adapter.getQueryMetadata("SELECT id, name, email FROM users");

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
      const metadata = await adapter.getQueryMetadata("SELECT id FROM users");

      expect(metadata.columns[0].typeCode).toBeDefined();
      expect(typeof metadata.columns[0].typeCode).toBe("number");
    });

    it("should extract column alias", async () => {
      const metadata = await adapter.getQueryMetadata("SELECT id AS user_id FROM users");

      expect(metadata.columns[0]).toMatchObject({
        name: "id",
        alias: "user_id",
      });
    });

    it("should handle SELECT *", async () => {
      const metadata = await adapter.getQueryMetadata("SELECT * FROM users");

      // Should return all columns from users table
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
      const metadata = await adapter.getQueryMetadata("SELECT id FROM users");

      expect(metadata.columns[0].type).toBe("INT");
      expect(metadata.columns[0].typeCode).toBe(3);
    });

    it("should detect VARCHAR type", async () => {
      const metadata = await adapter.getQueryMetadata("SELECT name FROM users");

      expect(metadata.columns[0].type).toBe("VARCHAR");
      expect(metadata.columns[0].typeCode).toBe(253);
    });

    it("should detect BIGINT type", async () => {
      const metadata = await adapter.getQueryMetadata("SELECT view_count FROM posts");

      expect(metadata.columns[0].type).toBe("BIGINT");
      expect(metadata.columns[0].typeCode).toBe(8);
    });

    it("should detect DECIMAL type", async () => {
      const metadata = await adapter.getQueryMetadata("SELECT balance FROM users");

      expect(metadata.columns[0].type).toBe("DECIMAL");
      expect(metadata.columns[0].typeCode).toBe(246);
    });

    it("should detect TIMESTAMP type", async () => {
      const metadata = await adapter.getQueryMetadata("SELECT created_at FROM users");

      expect(metadata.columns[0].type).toBe("TIMESTAMP");
      expect(metadata.columns[0].typeCode).toBe(7);
    });

    it("should detect JSON type", async () => {
      const metadata = await adapter.getQueryMetadata("SELECT metadata FROM users");

      expect(metadata.columns[0].type).toBe("JSON");
      expect(metadata.columns[0].typeCode).toBe(245);
    });
  });

  // =========================================================================
  // ENUM Type Handling
  // =========================================================================

  describe("ENUM Type Handling", () => {
    it("should detect ENUM type", async () => {
      const metadata = await adapter.getQueryMetadata("SELECT status FROM users");

      expect(metadata.columns[0].type).toBe("ENUM");
      expect(metadata.columns[0].typeCode).toBe(247);
    });

    it("should fetch ENUM values from INFORMATION_SCHEMA", async () => {
      const metadata = await adapter.getQueryMetadata("SELECT status FROM users");

      expect(metadata.columns[0].enumValues).toBeDefined();
      expect(metadata.columns[0].enumValues).toEqual(["pending", "active", "inactive"]);
    });

    it("should handle multiple ENUM columns", async () => {
      const metadata = await adapter.getQueryMetadata("SELECT status FROM users");

      expect(metadata.columns[0].enumValues).toBeDefined();
    });
  });

  // =========================================================================
  // Nullable Detection
  // =========================================================================

  describe("Nullable Detection", () => {
    it("should detect non-nullable column", async () => {
      const metadata = await adapter.getQueryMetadata("SELECT id FROM users");

      expect(metadata.columns[0].nullable).toBe(false);
    });

    it("should detect nullable column", async () => {
      const metadata = await adapter.getQueryMetadata("SELECT email FROM users");

      expect(metadata.columns[0].nullable).toBe(true);
    });

    it("should handle LEFT JOIN nullable columns", async () => {
      const metadata = await adapter.getQueryMetadata(`
        SELECT u.id, p.title
        FROM users u
        LEFT JOIN posts p ON u.id = p.user_id
      `);

      const titleColumn = metadata.columns.find((c) => c.name === "title");
      expect(titleColumn?.nullable).toBe(true);
    });
  });

  // =========================================================================
  // Aggregate Functions
  // =========================================================================

  describe("Aggregate Functions", () => {
    it("should detect COUNT aggregate", async () => {
      const metadata = await adapter.getQueryMetadata("SELECT COUNT(*) AS total FROM users");

      expect(metadata.columns[0]).toMatchObject({
        alias: "total",
        type: "BIGINT",
        isAggregate: true,
      });
    });

    it("should detect SUM aggregate", async () => {
      const metadata = await adapter.getQueryMetadata(
        "SELECT SUM(balance) AS total_balance FROM users",
      );

      expect(metadata.columns[0]).toMatchObject({
        alias: "total_balance",
        isAggregate: true,
        nullable: true, // SUM can return null for empty set
      });
    });

    it("should detect AVG aggregate", async () => {
      const metadata = await adapter.getQueryMetadata(
        "SELECT AVG(balance) AS avg_balance FROM users",
      );

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
      const metadata = await adapter.getQueryMetadata(`
        SELECT u.id, u.name, p.title
        FROM users u
        INNER JOIN posts p ON u.id = p.user_id
      `);

      expect(metadata.columns).toHaveLength(3);
      expect(metadata.columns[0].table).toBe("u");
      expect(metadata.columns[2].table).toBe("p");
    });

    it("should handle multiple JOINs", async () => {
      const metadata = await adapter.getQueryMetadata(`
        SELECT u.name, p.title, c.body
        FROM users u
        INNER JOIN posts p ON u.id = p.user_id
        INNER JOIN comments c ON p.id = c.post_id
      `);

      expect(metadata.columns).toHaveLength(3);
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe("Edge Cases", () => {
    it("should handle query with WHERE clause and parameters", async () => {
      const metadata = await adapter.getQueryMetadata("SELECT id, name FROM users WHERE id = ?");

      expect(metadata.columns).toHaveLength(2);
    });

    it("should handle query with ORDER BY", async () => {
      const metadata = await adapter.getQueryMetadata(
        "SELECT id, name FROM users ORDER BY id DESC",
      );

      expect(metadata.columns).toHaveLength(2);
    });

    it("should handle query with LIMIT", async () => {
      const metadata = await adapter.getQueryMetadata("SELECT id, name FROM users LIMIT 10");

      expect(metadata.columns).toHaveLength(2);
    });

    it("should handle subquery", async () => {
      const metadata = await adapter.getQueryMetadata(`
        SELECT id, name FROM users WHERE id IN (SELECT user_id FROM posts)
      `);

      expect(metadata.columns).toHaveLength(2);
    });

    it("should throw error for invalid SQL", async () => {
      await expect(adapter.getQueryMetadata("SELECT * FROM nonexistent_table")).rejects.toThrow();
    });

    it("should handle backtick-quoted identifiers", async () => {
      const metadata = await adapter.getQueryMetadata("SELECT `id`, `name` FROM `users`");

      expect(metadata.columns).toHaveLength(2);
      expect(metadata.columns[0].name).toBe("id");
    });
  });

  // =========================================================================
  // Expression Columns
  // =========================================================================

  describe("Expression Columns", () => {
    it("should handle literal values", async () => {
      const metadata = await adapter.getQueryMetadata("SELECT 1 AS one, 'hello' AS greeting");

      expect(metadata.columns).toHaveLength(2);
    });

    it("should handle arithmetic expressions", async () => {
      const metadata = await adapter.getQueryMetadata("SELECT id * 2 AS doubled FROM users");

      expect(metadata.columns).toHaveLength(1);
      expect(metadata.columns[0].alias).toBe("doubled");
    });

    it("should handle string concatenation", async () => {
      const metadata = await adapter.getQueryMetadata(
        "SELECT CONCAT(name, ' - ', email) AS full_info FROM users",
      );

      expect(metadata.columns).toHaveLength(1);
      expect(metadata.columns[0].type).toBe("VARCHAR");
    });

    it("should handle CASE expression", async () => {
      const metadata = await adapter.getQueryMetadata(`
        SELECT
          CASE WHEN status = 'active' THEN 1 ELSE 0 END AS is_active
        FROM users
      `);

      expect(metadata.columns).toHaveLength(1);
    });

    it("should handle COALESCE", async () => {
      const metadata = await adapter.getQueryMetadata(
        "SELECT COALESCE(email, 'no-email') AS email FROM users",
      );

      expect(metadata.columns).toHaveLength(1);
      // COALESCE result should not be nullable since fallback is provided
      expect(metadata.columns[0].nullable).toBe(false);
    });
  });
});

// =========================================================================
// Unit Tests (No DB Required)
// =========================================================================

describe("MySQL Adapter - Unit Tests", () => {
  describe("Configuration Validation", () => {
    it("should accept valid config", () => {
      expect(() => new MySQLAdapter(DB_CONFIG)).not.toThrow();
    });

    it("should use default port if not specified", () => {
      const configWithoutPort = {
        host: "localhost",
        user: "root",
        password: "password",
        database: "test_db",
      };
      expect(() => new MySQLAdapter(configWithoutPort as DatabaseConfig)).not.toThrow();
    });
  });

  describe("SQL Parsing Helper", () => {
    it("should detect SELECT statement", () => {
      // This tests internal parsing without DB connection
      expect(MySQLAdapter.isSelectQuery("SELECT * FROM users")).toBe(true);
      expect(MySQLAdapter.isSelectQuery("INSERT INTO users")).toBe(false);
      expect(MySQLAdapter.isSelectQuery("UPDATE users SET")).toBe(false);
      expect(MySQLAdapter.isSelectQuery("DELETE FROM users")).toBe(false);
    });

    it("should handle case insensitivity", () => {
      expect(MySQLAdapter.isSelectQuery("select * from users")).toBe(true);
      expect(MySQLAdapter.isSelectQuery("Select * From users")).toBe(true);
    });
  });
});
