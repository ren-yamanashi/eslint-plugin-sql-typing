/**
 * SQL Parser Unit Tests
 *
 * These tests verify the SQL parser correctly extracts column information
 * from various SQL query patterns.
 */

import { describe, it, expect } from "vitest";
import { parseSql } from "../../src/core/sql-parser.js";

describe("SQL Parser", () => {
  // =========================================================================
  // Simple SELECT Queries
  // =========================================================================

  describe("Simple SELECT", () => {
    it("should parse single column SELECT", () => {
      const result = parseSql("SELECT id FROM users");

      expect(result).toEqual({
        type: "SELECT",
        columns: [{ name: "id", alias: null, table: null }],
        tables: [{ name: "users", alias: null }],
      });
    });

    it("should parse multiple column SELECT", () => {
      const result = parseSql("SELECT id, name, email FROM users");

      expect(result).toEqual({
        type: "SELECT",
        columns: [
          { name: "id", alias: null, table: null },
          { name: "name", alias: null, table: null },
          { name: "email", alias: null, table: null },
        ],
        tables: [{ name: "users", alias: null }],
      });
    });

    it("should parse SELECT *", () => {
      const result = parseSql("SELECT * FROM users");

      expect(result).toEqual({
        type: "SELECT",
        columns: [{ name: "*", alias: null, table: null }],
        tables: [{ name: "users", alias: null }],
      });
    });
  });

  // =========================================================================
  // Column Aliases
  // =========================================================================

  describe("Column Aliases", () => {
    it("should parse column with AS alias", () => {
      const result = parseSql("SELECT id AS user_id FROM users");

      expect(result).toEqual({
        type: "SELECT",
        columns: [{ name: "id", alias: "user_id", table: null }],
        tables: [{ name: "users", alias: null }],
      });
    });

    it("should parse multiple columns with aliases", () => {
      const result = parseSql("SELECT id AS user_id, name AS user_name FROM users");

      expect(result).toEqual({
        type: "SELECT",
        columns: [
          { name: "id", alias: "user_id", table: null },
          { name: "name", alias: "user_name", table: null },
        ],
        tables: [{ name: "users", alias: null }],
      });
    });

    it("should parse mixed aliased and non-aliased columns", () => {
      const result = parseSql("SELECT id AS user_id, name, email FROM users");

      expect(result).toEqual({
        type: "SELECT",
        columns: [
          { name: "id", alias: "user_id", table: null },
          { name: "name", alias: null, table: null },
          { name: "email", alias: null, table: null },
        ],
        tables: [{ name: "users", alias: null }],
      });
    });
  });

  // =========================================================================
  // Table References
  // =========================================================================

  describe("Table References", () => {
    it("should parse table with alias", () => {
      const result = parseSql("SELECT u.id, u.name FROM users u");

      expect(result).toEqual({
        type: "SELECT",
        columns: [
          { name: "id", alias: null, table: "u" },
          { name: "name", alias: null, table: "u" },
        ],
        tables: [{ name: "users", alias: "u" }],
      });
    });

    it("should parse fully qualified column names", () => {
      const result = parseSql("SELECT users.id, users.name FROM users");

      expect(result).toEqual({
        type: "SELECT",
        columns: [
          { name: "id", alias: null, table: "users" },
          { name: "name", alias: null, table: "users" },
        ],
        tables: [{ name: "users", alias: null }],
      });
    });
  });

  // =========================================================================
  // JOIN Queries
  // =========================================================================

  describe("JOIN Queries", () => {
    it("should parse INNER JOIN", () => {
      const result = parseSql(`
        SELECT p.id, p.title, u.name
        FROM posts p
        INNER JOIN users u ON p.user_id = u.id
      `);

      expect(result).toEqual({
        type: "SELECT",
        columns: [
          { name: "id", alias: null, table: "p" },
          { name: "title", alias: null, table: "p" },
          { name: "name", alias: null, table: "u" },
        ],
        tables: [
          { name: "posts", alias: "p" },
          { name: "users", alias: "u" },
        ],
      });
    });

    it("should parse LEFT JOIN", () => {
      const result = parseSql(`
        SELECT u.id, u.name, p.title
        FROM users u
        LEFT JOIN posts p ON u.id = p.user_id
      `);

      expect(result).toEqual({
        type: "SELECT",
        columns: [
          { name: "id", alias: null, table: "u" },
          { name: "name", alias: null, table: "u" },
          { name: "title", alias: null, table: "p" },
        ],
        tables: [
          { name: "users", alias: "u" },
          { name: "posts", alias: "p" },
        ],
      });
    });

    it("should parse multiple JOINs", () => {
      const result = parseSql(`
        SELECT p.id, p.title, u.name, c.body
        FROM posts p
        INNER JOIN users u ON p.user_id = u.id
        INNER JOIN comments c ON p.id = c.post_id
      `);

      expect(result).toEqual({
        type: "SELECT",
        columns: [
          { name: "id", alias: null, table: "p" },
          { name: "title", alias: null, table: "p" },
          { name: "name", alias: null, table: "u" },
          { name: "body", alias: null, table: "c" },
        ],
        tables: [
          { name: "posts", alias: "p" },
          { name: "users", alias: "u" },
          { name: "comments", alias: "c" },
        ],
      });
    });
  });

  // =========================================================================
  // WHERE, ORDER BY, LIMIT Clauses
  // =========================================================================

  describe("WHERE, ORDER BY, LIMIT", () => {
    it("should parse SELECT with WHERE clause", () => {
      const result = parseSql("SELECT id, name FROM users WHERE id = 1");

      expect(result).toEqual({
        type: "SELECT",
        columns: [
          { name: "id", alias: null, table: null },
          { name: "name", alias: null, table: null },
        ],
        tables: [{ name: "users", alias: null }],
      });
    });

    it("should parse SELECT with ORDER BY", () => {
      const result = parseSql("SELECT id, name FROM users ORDER BY id DESC");

      expect(result).toEqual({
        type: "SELECT",
        columns: [
          { name: "id", alias: null, table: null },
          { name: "name", alias: null, table: null },
        ],
        tables: [{ name: "users", alias: null }],
      });
    });

    it("should parse SELECT with LIMIT", () => {
      const result = parseSql("SELECT id, name FROM users LIMIT 10");

      expect(result).toEqual({
        type: "SELECT",
        columns: [
          { name: "id", alias: null, table: null },
          { name: "name", alias: null, table: null },
        ],
        tables: [{ name: "users", alias: null }],
      });
    });

    it("should parse SELECT with all clauses", () => {
      const result = parseSql(`
        SELECT id, name
        FROM users
        WHERE status = 'active'
        ORDER BY created_at DESC
        LIMIT 10
      `);

      expect(result).toEqual({
        type: "SELECT",
        columns: [
          { name: "id", alias: null, table: null },
          { name: "name", alias: null, table: null },
        ],
        tables: [{ name: "users", alias: null }],
      });
    });
  });

  // =========================================================================
  // Aggregate Functions
  // =========================================================================

  describe("Aggregate Functions", () => {
    it("should parse COUNT(*)", () => {
      const result = parseSql("SELECT COUNT(*) AS total FROM users");

      expect(result).toEqual({
        type: "SELECT",
        columns: [
          {
            name: "COUNT(*)",
            alias: "total",
            table: null,
            isAggregate: true,
            aggregateType: "COUNT",
          },
        ],
        tables: [{ name: "users", alias: null }],
      });
    });

    it("should parse SUM", () => {
      const result = parseSql("SELECT SUM(balance) AS total_balance FROM users");

      expect(result).toEqual({
        type: "SELECT",
        columns: [
          {
            name: "SUM(balance)",
            alias: "total_balance",
            table: null,
            isAggregate: true,
            aggregateType: "SUM",
            aggregateColumn: "balance",
          },
        ],
        tables: [{ name: "users", alias: null }],
      });
    });

    it("should parse GROUP BY", () => {
      const result = parseSql("SELECT status, COUNT(*) AS count FROM users GROUP BY status");

      expect(result).toEqual({
        type: "SELECT",
        columns: [
          { name: "status", alias: null, table: null },
          {
            name: "COUNT(*)",
            alias: "count",
            table: null,
            isAggregate: true,
            aggregateType: "COUNT",
          },
        ],
        tables: [{ name: "users", alias: null }],
      });
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe("Edge Cases", () => {
    it("should handle case-insensitive keywords", () => {
      const result = parseSql("select id, name from users");

      expect(result).toEqual({
        type: "SELECT",
        columns: [
          { name: "id", alias: null, table: null },
          { name: "name", alias: null, table: null },
        ],
        tables: [{ name: "users", alias: null }],
      });
    });

    it("should handle extra whitespace", () => {
      const result = parseSql("  SELECT   id,   name   FROM   users  ");

      expect(result).toEqual({
        type: "SELECT",
        columns: [
          { name: "id", alias: null, table: null },
          { name: "name", alias: null, table: null },
        ],
        tables: [{ name: "users", alias: null }],
      });
    });

    it("should handle multiline queries", () => {
      const result = parseSql(`
        SELECT
          id,
          name,
          email
        FROM
          users
      `);

      expect(result).toEqual({
        type: "SELECT",
        columns: [
          { name: "id", alias: null, table: null },
          { name: "name", alias: null, table: null },
          { name: "email", alias: null, table: null },
        ],
        tables: [{ name: "users", alias: null }],
      });
    });

    it("should handle backtick-quoted identifiers", () => {
      const result = parseSql("SELECT `id`, `name` FROM `users`");

      expect(result).toEqual({
        type: "SELECT",
        columns: [
          { name: "id", alias: null, table: null },
          { name: "name", alias: null, table: null },
        ],
        tables: [{ name: "users", alias: null }],
      });
    });
  });
});
