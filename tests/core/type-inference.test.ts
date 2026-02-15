/**
 * Type Inference Unit Tests
 *
 * These tests verify the type inference engine correctly maps MySQL metadata
 * to TypeScript types.
 */

import { describe, it, expect } from "vitest";
import { inferTypes } from "../../src/core/type-inference.js";
import type { QueryMetadata, ColumnMetadata } from "../../src/types/metadata.js";

describe("Type Inference", () => {
  // =========================================================================
  // Basic Type Mapping
  // =========================================================================

  describe("Basic Type Mapping", () => {
    it("should infer number for INT column", () => {
      const metadata: QueryMetadata = {
        columns: [
          {
            name: "id",
            table: "users",
            type: "INT",
            typeCode: 3,
            nullable: false,
          },
        ],
      };

      const result = inferTypes(metadata);

      expect(result).toEqual({
        id: { type: "number", nullable: false },
      });
    });

    it("should infer string for VARCHAR column", () => {
      const metadata: QueryMetadata = {
        columns: [
          {
            name: "name",
            table: "users",
            type: "VARCHAR",
            typeCode: 253,
            nullable: false,
          },
        ],
      };

      const result = inferTypes(metadata);

      expect(result).toEqual({
        name: { type: "string", nullable: false },
      });
    });

    it("should infer Date for TIMESTAMP column", () => {
      const metadata: QueryMetadata = {
        columns: [
          {
            name: "created_at",
            table: "users",
            type: "TIMESTAMP",
            typeCode: 7,
            nullable: false,
          },
        ],
      };

      const result = inferTypes(metadata);

      expect(result).toEqual({
        created_at: { type: "Date", nullable: false },
      });
    });
  });

  // =========================================================================
  // Nullable Types
  // =========================================================================

  describe("Nullable Types", () => {
    it("should infer nullable string for nullable VARCHAR", () => {
      const metadata: QueryMetadata = {
        columns: [
          {
            name: "email",
            table: "users",
            type: "VARCHAR",
            typeCode: 253,
            nullable: true,
          },
        ],
      };

      const result = inferTypes(metadata);

      expect(result).toEqual({
        email: { type: "string", nullable: true },
      });
    });

    it("should infer nullable number for nullable INT", () => {
      const metadata: QueryMetadata = {
        columns: [
          {
            name: "age",
            table: "users",
            type: "INT",
            typeCode: 3,
            nullable: true,
          },
        ],
      };

      const result = inferTypes(metadata);

      expect(result).toEqual({
        age: { type: "number", nullable: true },
      });
    });

    it("should infer nullable Date for nullable TIMESTAMP", () => {
      const metadata: QueryMetadata = {
        columns: [
          {
            name: "updated_at",
            table: "users",
            type: "TIMESTAMP",
            typeCode: 7,
            nullable: true,
          },
        ],
      };

      const result = inferTypes(metadata);

      expect(result).toEqual({
        updated_at: { type: "Date", nullable: true },
      });
    });
  });

  // =========================================================================
  // Special Types
  // =========================================================================

  describe("Special Types", () => {
    it("should infer string for BIGINT (precision)", () => {
      const metadata: QueryMetadata = {
        columns: [
          {
            name: "view_count",
            table: "posts",
            type: "BIGINT",
            typeCode: 8,
            nullable: false,
          },
        ],
      };

      const result = inferTypes(metadata);

      expect(result).toEqual({
        view_count: { type: "string", nullable: false },
      });
    });

    it("should infer string for DECIMAL (precision)", () => {
      const metadata: QueryMetadata = {
        columns: [
          {
            name: "balance",
            table: "users",
            type: "DECIMAL",
            typeCode: 246,
            nullable: false,
          },
        ],
      };

      const result = inferTypes(metadata);

      expect(result).toEqual({
        balance: { type: "string", nullable: false },
      });
    });

    it("should infer unknown for JSON column", () => {
      const metadata: QueryMetadata = {
        columns: [
          {
            name: "metadata",
            table: "users",
            type: "JSON",
            typeCode: 245,
            nullable: true,
          },
        ],
      };

      const result = inferTypes(metadata);

      expect(result).toEqual({
        metadata: { type: "unknown", nullable: true },
      });
    });

    it("should infer number for TINYINT(1) (boolean)", () => {
      const metadata: QueryMetadata = {
        columns: [
          {
            name: "published",
            table: "posts",
            type: "TINYINT",
            typeCode: 1,
            nullable: false,
          },
        ],
      };

      const result = inferTypes(metadata);

      expect(result).toEqual({
        published: { type: "number", nullable: false },
      });
    });
  });

  // =========================================================================
  // ENUM Types
  // =========================================================================

  describe("ENUM Types", () => {
    it("should infer union type for ENUM", () => {
      const metadata: QueryMetadata = {
        columns: [
          {
            name: "status",
            table: "users",
            type: "ENUM",
            typeCode: 247,
            nullable: false,
            enumValues: ["pending", "active", "inactive"],
          },
        ],
      };

      const result = inferTypes(metadata);

      expect(result).toEqual({
        status: {
          type: "enum",
          nullable: false,
          enumValues: ["pending", "active", "inactive"],
        },
      });
    });

    it("should infer nullable union type for nullable ENUM", () => {
      const metadata: QueryMetadata = {
        columns: [
          {
            name: "status",
            table: "users",
            type: "ENUM",
            typeCode: 247,
            nullable: true,
            enumValues: ["pending", "active", "inactive"],
          },
        ],
      };

      const result = inferTypes(metadata);

      expect(result).toEqual({
        status: {
          type: "enum",
          nullable: true,
          enumValues: ["pending", "active", "inactive"],
        },
      });
    });
  });

  // =========================================================================
  // Multiple Columns
  // =========================================================================

  describe("Multiple Columns", () => {
    it("should infer types for multiple columns", () => {
      const metadata: QueryMetadata = {
        columns: [
          {
            name: "id",
            table: "users",
            type: "INT",
            typeCode: 3,
            nullable: false,
          },
          {
            name: "name",
            table: "users",
            type: "VARCHAR",
            typeCode: 253,
            nullable: false,
          },
          {
            name: "email",
            table: "users",
            type: "VARCHAR",
            typeCode: 253,
            nullable: true,
          },
          {
            name: "status",
            table: "users",
            type: "ENUM",
            typeCode: 247,
            nullable: false,
            enumValues: ["pending", "active", "inactive"],
          },
        ],
      };

      const result = inferTypes(metadata);

      expect(result).toEqual({
        id: { type: "number", nullable: false },
        name: { type: "string", nullable: false },
        email: { type: "string", nullable: true },
        status: {
          type: "enum",
          nullable: false,
          enumValues: ["pending", "active", "inactive"],
        },
      });
    });
  });

  // =========================================================================
  // Aliased Columns
  // =========================================================================

  describe("Aliased Columns", () => {
    it("should use alias as property name when present", () => {
      const metadata: QueryMetadata = {
        columns: [
          {
            name: "id",
            alias: "user_id",
            table: "users",
            type: "INT",
            typeCode: 3,
            nullable: false,
          },
          {
            name: "name",
            alias: "user_name",
            table: "users",
            type: "VARCHAR",
            typeCode: 253,
            nullable: false,
          },
        ],
      };

      const result = inferTypes(metadata);

      expect(result).toEqual({
        user_id: { type: "number", nullable: false },
        user_name: { type: "string", nullable: false },
      });
    });
  });

  // =========================================================================
  // Aggregate Functions
  // =========================================================================

  describe("Aggregate Functions", () => {
    it("should infer string for COUNT (BIGINT)", () => {
      const metadata: QueryMetadata = {
        columns: [
          {
            name: "total",
            table: null,
            type: "BIGINT",
            typeCode: 8,
            nullable: false,
            isAggregate: true,
          },
        ],
      };

      const result = inferTypes(metadata);

      expect(result).toEqual({
        total: { type: "string", nullable: false },
      });
    });

    it("should infer string for SUM of DECIMAL", () => {
      const metadata: QueryMetadata = {
        columns: [
          {
            name: "total_balance",
            table: null,
            type: "DECIMAL",
            typeCode: 246,
            nullable: true, // SUM can return null for empty set
            isAggregate: true,
          },
        ],
      };

      const result = inferTypes(metadata);

      expect(result).toEqual({
        total_balance: { type: "string", nullable: true },
      });
    });
  });

  // =========================================================================
  // All MySQL Types Coverage
  // =========================================================================

  describe("MySQL Type Coverage", () => {
    const testCases: Array<{
      mysqlType: string;
      typeCode: number;
      expectedType: string;
    }> = [
      { mysqlType: "TINYINT", typeCode: 1, expectedType: "number" },
      { mysqlType: "SMALLINT", typeCode: 2, expectedType: "number" },
      { mysqlType: "MEDIUMINT", typeCode: 9, expectedType: "number" },
      { mysqlType: "INT", typeCode: 3, expectedType: "number" },
      { mysqlType: "BIGINT", typeCode: 8, expectedType: "string" },
      { mysqlType: "FLOAT", typeCode: 4, expectedType: "number" },
      { mysqlType: "DOUBLE", typeCode: 5, expectedType: "number" },
      { mysqlType: "DECIMAL", typeCode: 246, expectedType: "string" },
      { mysqlType: "VARCHAR", typeCode: 253, expectedType: "string" },
      { mysqlType: "CHAR", typeCode: 254, expectedType: "string" },
      { mysqlType: "TEXT", typeCode: 252, expectedType: "string" },
      { mysqlType: "BLOB", typeCode: 252, expectedType: "Buffer" },
      { mysqlType: "DATE", typeCode: 10, expectedType: "Date" },
      { mysqlType: "DATETIME", typeCode: 12, expectedType: "Date" },
      { mysqlType: "TIMESTAMP", typeCode: 7, expectedType: "Date" },
      { mysqlType: "TIME", typeCode: 11, expectedType: "string" },
      { mysqlType: "YEAR", typeCode: 13, expectedType: "number" },
      { mysqlType: "JSON", typeCode: 245, expectedType: "unknown" },
    ];

    testCases.forEach(({ mysqlType, typeCode, expectedType }) => {
      it(`should infer ${expectedType} for ${mysqlType}`, () => {
        const metadata: QueryMetadata = {
          columns: [
            {
              name: "column",
              table: "test",
              type: mysqlType,
              typeCode,
              nullable: false,
            },
          ],
        };

        const result = inferTypes(metadata);

        expect(result.column.type).toBe(expectedType);
      });
    });
  });
});
