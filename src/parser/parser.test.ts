import { describe, expect, it } from "vitest";

import { parseSql } from "./parser";

describe("SQL Parser", () => {
  describe("Simple SELECT", () => {
    it("should parse single column SELECT", () => {
      // GIVEN
      const sql = "SELECT id FROM users";

      // WHEN
      const result = parseSql(sql);

      // THEN
      expect(result).toEqual({
        type: "SELECT",
        columns: [{ name: "id", alias: null, table: null }],
        tables: [{ name: "users", alias: null }],
      });
    });

    it("should parse multiple column SELECT", () => {
      // GIVEN
      const sql = "SELECT id, name, email FROM users";

      // WHEN
      const result = parseSql(sql);

      // THEN
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
      // GIVEN
      const sql = "SELECT * FROM users";

      // WHEN
      const result = parseSql(sql);

      // THEN
      expect(result).toEqual({
        type: "SELECT",
        columns: [{ name: "*", alias: null, table: null }],
        tables: [{ name: "users", alias: null }],
      });
    });
  });

  describe("Column Aliases", () => {
    it("should parse column with AS alias", () => {
      // GIVEN
      const sql = "SELECT id AS user_id FROM users";

      // WHEN
      const result = parseSql(sql);

      // THEN
      expect(result).toEqual({
        type: "SELECT",
        columns: [{ name: "id", alias: "user_id", table: null }],
        tables: [{ name: "users", alias: null }],
      });
    });

    it("should parse multiple columns with aliases", () => {
      // GIVEN
      const sql = "SELECT id AS user_id, name AS user_name FROM users";

      // WHEN
      const result = parseSql(sql);

      // THEN
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
      // GIVEN
      const sql = "SELECT id AS user_id, name, email FROM users";

      // WHEN
      const result = parseSql(sql);

      // THEN
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

  describe("Table References", () => {
    it("should parse table with alias", () => {
      // GIVEN
      const sql = "SELECT u.id, u.name FROM users u";

      // WHEN
      const result = parseSql(sql);

      // THEN
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
      // GIVEN
      const sql = "SELECT users.id, users.name FROM users";

      // WHEN
      const result = parseSql(sql);

      // THEN
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

  describe("JOIN Queries", () => {
    it("should parse INNER JOIN", () => {
      // GIVEN
      const sql = `
        SELECT p.id, p.title, u.name
        FROM posts p
        INNER JOIN users u ON p.user_id = u.id
      `;

      // WHEN
      const result = parseSql(sql);

      // THEN
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
      // GIVEN
      const sql = `
        SELECT u.id, u.name, p.title
        FROM users u
        LEFT JOIN posts p ON u.id = p.user_id
      `;

      // WHEN
      const result = parseSql(sql);

      // THEN
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
      // GIVEN
      const sql = `
        SELECT p.id, p.title, u.name, c.body
        FROM posts p
        INNER JOIN users u ON p.user_id = u.id
        INNER JOIN comments c ON p.id = c.post_id
      `;

      // WHEN
      const result = parseSql(sql);

      // THEN
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
      // GIVEN
      const sql = "SELECT id, name FROM users WHERE id = 1";

      // WHEN
      const result = parseSql(sql);

      // THEN
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
      // GIVEN
      const sql = "SELECT id, name FROM users ORDER BY id DESC";

      // WHEN
      const result = parseSql(sql);

      // THEN
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
      // GIVEN
      const sql = "SELECT id, name FROM users LIMIT 10";

      // WHEN
      const result = parseSql(sql);

      // THEN
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
      // GIVEN
      const sql = `
        SELECT id, name
        FROM users
        WHERE status = 'active'
        ORDER BY created_at DESC
        LIMIT 10
      `;

      // WHEN
      const result = parseSql(sql);

      // THEN
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

  describe("Aggregate Functions", () => {
    it("should parse COUNT(*)", () => {
      // GIVEN
      const sql = "SELECT COUNT(*) AS total FROM users";

      // WHEN
      const result = parseSql(sql);

      // THEN
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
      // GIVEN
      const sql = "SELECT SUM(balance) AS total_balance FROM users";

      // WHEN
      const result = parseSql(sql);

      // THEN
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
      // GIVEN
      const sql = "SELECT status, COUNT(*) AS count FROM users GROUP BY status";

      // WHEN
      const result = parseSql(sql);

      // THEN
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

  describe("Edge Cases", () => {
    it("should handle case-insensitive keywords", () => {
      // GIVEN
      const sql = "select id, name from users";

      // WHEN
      const result = parseSql(sql);

      // THEN
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
      // GIVEN
      const sql = "  SELECT   id,   name   FROM   users  ";

      // WHEN
      const result = parseSql(sql);

      // THEN
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
      // GIVEN
      const sql = `
        SELECT
          id,
          name,
          email
        FROM
          users
      `;

      // WHEN
      const result = parseSql(sql);

      // THEN
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
      // GIVEN
      const sql = "SELECT `id`, `name` FROM `users`";

      // WHEN
      const result = parseSql(sql);

      // THEN
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
