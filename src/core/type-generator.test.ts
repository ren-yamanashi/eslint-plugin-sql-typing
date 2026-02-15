/**
 * Type Generator Unit Tests
 *
 * These tests verify the type generator correctly produces TypeScript
 * type strings from inferred type information.
 */

import { describe, it, expect } from "vitest";

import type { InferredTypes } from "../types/inference.js";

import { generateTypeString } from "./type-generator.js";

describe("Type Generator", () => {
  // =========================================================================
  // Basic Type Generation
  // =========================================================================

  describe("Basic Type Generation", () => {
    it("should generate type for single number column", () => {
      // GIVEN
      const types: InferredTypes = {
        id: { type: "number", nullable: false },
      };

      // WHEN
      const result = generateTypeString(types);

      // THEN
      expect(result).toBe("{ id: number }");
    });

    it("should generate type for single string column", () => {
      // GIVEN
      const types: InferredTypes = {
        name: { type: "string", nullable: false },
      };

      // WHEN
      const result = generateTypeString(types);

      // THEN
      expect(result).toBe("{ name: string }");
    });

    it("should generate type for single Date column", () => {
      // GIVEN
      const types: InferredTypes = {
        created_at: { type: "Date", nullable: false },
      };

      // WHEN
      const result = generateTypeString(types);

      // THEN
      expect(result).toBe("{ created_at: Date }");
    });

    it("should generate type for multiple columns", () => {
      // GIVEN
      const types: InferredTypes = {
        id: { type: "number", nullable: false },
        name: { type: "string", nullable: false },
        created_at: { type: "Date", nullable: false },
      };

      // WHEN
      const result = generateTypeString(types);

      // THEN
      expect(result).toBe("{ id: number; name: string; created_at: Date }");
    });
  });

  // =========================================================================
  // Nullable Types
  // =========================================================================

  describe("Nullable Types", () => {
    it("should generate type with | null for nullable column", () => {
      // GIVEN
      const types: InferredTypes = {
        email: { type: "string", nullable: true },
      };

      // WHEN
      const result = generateTypeString(types);

      // THEN
      expect(result).toBe("{ email: string | null }");
    });

    it("should generate mixed nullable and non-nullable", () => {
      // GIVEN
      const types: InferredTypes = {
        id: { type: "number", nullable: false },
        email: { type: "string", nullable: true },
        name: { type: "string", nullable: false },
      };

      // WHEN
      const result = generateTypeString(types);

      // THEN
      expect(result).toBe("{ id: number; email: string | null; name: string }");
    });

    it("should generate nullable Date type", () => {
      // GIVEN
      const types: InferredTypes = {
        updated_at: { type: "Date", nullable: true },
      };

      // WHEN
      const result = generateTypeString(types);

      // THEN
      expect(result).toBe("{ updated_at: Date | null }");
    });
  });

  // =========================================================================
  // ENUM Types
  // =========================================================================

  describe("ENUM Types", () => {
    it("should generate union type for ENUM", () => {
      // GIVEN
      const types: InferredTypes = {
        status: {
          type: "enum",
          nullable: false,
          enumValues: ["pending", "active", "inactive"],
        },
      };

      // WHEN
      const result = generateTypeString(types);

      // THEN
      expect(result).toBe('{ status: "pending" | "active" | "inactive" }');
    });

    it("should generate nullable union type for nullable ENUM", () => {
      // GIVEN
      const types: InferredTypes = {
        status: {
          type: "enum",
          nullable: true,
          enumValues: ["pending", "active", "inactive"],
        },
      };

      // WHEN
      const result = generateTypeString(types);

      // THEN
      expect(result).toBe('{ status: "pending" | "active" | "inactive" | null }');
    });

    it("should handle ENUM with single value", () => {
      // GIVEN
      const types: InferredTypes = {
        role: {
          type: "enum",
          nullable: false,
          enumValues: ["admin"],
        },
      };

      // WHEN
      const result = generateTypeString(types);

      // THEN
      expect(result).toBe('{ role: "admin" }');
    });

    it("should escape special characters in ENUM values", () => {
      // GIVEN
      const types: InferredTypes = {
        status: {
          type: "enum",
          nullable: false,
          enumValues: ['pending"test', "active's"],
        },
      };

      // WHEN
      const result = generateTypeString(types);

      // THEN
      expect(result).toBe('{ status: "pending\\"test" | "active\'s" }');
    });
  });

  // =========================================================================
  // Special Types
  // =========================================================================

  describe("Special Types", () => {
    it("should generate Buffer type", () => {
      // GIVEN
      const types: InferredTypes = {
        data: { type: "Buffer", nullable: false },
      };

      // WHEN
      const result = generateTypeString(types);

      // THEN
      expect(result).toBe("{ data: Buffer }");
    });

    it("should generate unknown type for JSON", () => {
      // GIVEN
      const types: InferredTypes = {
        metadata: { type: "unknown", nullable: true },
      };

      // WHEN
      const result = generateTypeString(types);

      // THEN
      expect(result).toBe("{ metadata: unknown | null }");
    });
  });

  // =========================================================================
  // mysql2 Format
  // =========================================================================

  describe("mysql2 Format", () => {
    it("should generate RowDataPacket intersection type", () => {
      // GIVEN
      const types: InferredTypes = {
        id: { type: "number", nullable: false },
        name: { type: "string", nullable: false },
      };

      // WHEN
      const result = generateTypeString(types, { format: "mysql2" });

      // THEN
      expect(result).toBe("(RowDataPacket & { id: number; name: string })[]");
    });

    it("should generate RowDataPacket with nullable columns", () => {
      // GIVEN
      const types: InferredTypes = {
        id: { type: "number", nullable: false },
        email: { type: "string", nullable: true },
      };

      // WHEN
      const result = generateTypeString(types, { format: "mysql2" });

      // THEN
      expect(result).toBe("(RowDataPacket & { id: number; email: string | null })[]");
    });

    it("should generate RowDataPacket with ENUM", () => {
      // GIVEN
      const types: InferredTypes = {
        id: { type: "number", nullable: false },
        status: {
          type: "enum",
          nullable: false,
          enumValues: ["pending", "active", "inactive"],
        },
      };

      // WHEN
      const result = generateTypeString(types, { format: "mysql2" });

      // THEN
      expect(result).toBe(
        '(RowDataPacket & { id: number; status: "pending" | "active" | "inactive" })[]',
      );
    });
  });

  // =========================================================================
  // nestTables Format
  // =========================================================================

  describe("nestTables Format", () => {
    it("should generate nested object type for nestTables", () => {
      // GIVEN
      const types: InferredTypes = {
        "users.id": { type: "number", nullable: false, table: "users" },
        "users.name": { type: "string", nullable: false, table: "users" },
        "posts.id": { type: "number", nullable: false, table: "posts" },
        "posts.title": { type: "string", nullable: false, table: "posts" },
      };

      // WHEN
      const result = generateTypeString(types, {
        format: "mysql2",
        nestTables: true,
      });

      // THEN
      expect(result).toBe(
        "(RowDataPacket & { users: { id: number; name: string }; posts: { id: number; title: string } })[]",
      );
    });

    it("should handle nullable columns in nested format", () => {
      // GIVEN
      const types: InferredTypes = {
        "users.id": { type: "number", nullable: false, table: "users" },
        "users.email": { type: "string", nullable: true, table: "users" },
      };

      // WHEN
      const result = generateTypeString(types, {
        format: "mysql2",
        nestTables: true,
      });

      // THEN
      expect(result).toBe("(RowDataPacket & { users: { id: number; email: string | null } })[]");
    });
  });

  // =========================================================================
  // rowsAsArray Format
  // =========================================================================

  describe("rowsAsArray Format", () => {
    it("should generate tuple type for rowsAsArray", () => {
      // GIVEN
      const types: InferredTypes = {
        id: { type: "number", nullable: false },
        name: { type: "string", nullable: false },
      };

      // WHEN
      const result = generateTypeString(types, {
        format: "mysql2",
        rowsAsArray: true,
      });

      // THEN
      expect(result).toBe("[number, string][]");
    });

    it("should handle nullable columns in tuple format", () => {
      // GIVEN
      const types: InferredTypes = {
        id: { type: "number", nullable: false },
        email: { type: "string", nullable: true },
      };

      // WHEN
      const result = generateTypeString(types, {
        format: "mysql2",
        rowsAsArray: true,
      });

      // THEN
      expect(result).toBe("[number, string | null][]");
    });

    it("should handle ENUM in tuple format", () => {
      // GIVEN
      const types: InferredTypes = {
        id: { type: "number", nullable: false },
        status: {
          type: "enum",
          nullable: false,
          enumValues: ["pending", "active"],
        },
      };

      // WHEN
      const result = generateTypeString(types, {
        format: "mysql2",
        rowsAsArray: true,
      });

      // THEN
      expect(result).toBe('[number, "pending" | "active"][]');
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe("Edge Cases", () => {
    it("should handle empty column set", () => {
      // GIVEN
      const types: InferredTypes = {};

      // WHEN
      const result = generateTypeString(types);

      // THEN
      expect(result).toBe("{}");
    });

    it("should handle column names with special characters", () => {
      // GIVEN
      const types: InferredTypes = {
        "user-id": { type: "number", nullable: false },
        user_name: { type: "string", nullable: false },
      };

      // WHEN
      const result = generateTypeString(types);

      // THEN
      expect(result).toBe('{ "user-id": number; user_name: string }');
    });

    it("should handle column names that are reserved words", () => {
      // GIVEN
      const types: InferredTypes = {
        class: { type: "string", nullable: false },
        function: { type: "string", nullable: false },
      };

      // WHEN
      const result = generateTypeString(types);

      // THEN
      expect(result).toBe("{ class: string; function: string }");
    });

    it("should preserve column order", () => {
      // GIVEN
      const types: InferredTypes = {
        z: { type: "number", nullable: false },
        a: { type: "string", nullable: false },
        m: { type: "Date", nullable: false },
      };

      // WHEN
      const result = generateTypeString(types);

      // THEN
      expect(result).toBe("{ z: number; a: string; m: Date }");
    });
  });

  // =========================================================================
  // Complex Scenarios
  // =========================================================================

  describe("Complex Scenarios", () => {
    it("should generate type for real-world user query", () => {
      // GIVEN
      const types: InferredTypes = {
        id: { type: "number", nullable: false },
        name: { type: "string", nullable: false },
        email: { type: "string", nullable: true },
        status: {
          type: "enum",
          nullable: false,
          enumValues: ["pending", "active", "inactive"],
        },
        balance: { type: "string", nullable: false },
        created_at: { type: "Date", nullable: false },
        updated_at: { type: "Date", nullable: true },
        metadata: { type: "unknown", nullable: true },
      };

      // WHEN
      const result = generateTypeString(types, { format: "mysql2" });

      // THEN
      expect(result).toBe(
        '(RowDataPacket & { id: number; name: string; email: string | null; status: "pending" | "active" | "inactive"; balance: string; created_at: Date; updated_at: Date | null; metadata: unknown | null })[]',
      );
    });

    it("should generate type for COUNT query", () => {
      // GIVEN
      const types: InferredTypes = {
        total: { type: "string", nullable: false },
      };

      // WHEN
      const result = generateTypeString(types, { format: "mysql2" });

      // THEN
      expect(result).toBe("(RowDataPacket & { total: string })[]");
    });

    it("should generate type for JOIN query", () => {
      // GIVEN
      const types: InferredTypes = {
        user_id: { type: "number", nullable: false },
        user_name: { type: "string", nullable: false },
        post_id: { type: "number", nullable: false },
        post_title: { type: "string", nullable: false },
      };

      // WHEN
      const result = generateTypeString(types, { format: "mysql2" });

      // THEN
      expect(result).toBe(
        "(RowDataPacket & { user_id: number; user_name: string; post_id: number; post_title: string })[]",
      );
    });
  });
});
