import { describe, expect, it } from "vitest";

import type { ColumnMeta, QueryMeta } from "../types/meta.i";

import { genColumnTypeRegistry, getPropertyName, inferColumnType, TYPE_MAPPING } from "./worker";

describe("Worker", () => {
  describe("TYPE_MAPPING", () => {
    it("should map integer types to number", () => {
      expect(TYPE_MAPPING["TINYINT"]).toBe("number");
      expect(TYPE_MAPPING["SMALLINT"]).toBe("number");
      expect(TYPE_MAPPING["MEDIUMINT"]).toBe("number");
      expect(TYPE_MAPPING["INT"]).toBe("number");
      expect(TYPE_MAPPING["YEAR"]).toBe("number");
      expect(TYPE_MAPPING["FLOAT"]).toBe("number");
      expect(TYPE_MAPPING["DOUBLE"]).toBe("number");
    });

    it("should map large number types to string", () => {
      expect(TYPE_MAPPING["BIGINT"]).toBe("string");
      expect(TYPE_MAPPING["DECIMAL"]).toBe("string");
    });

    it("should map string types to string", () => {
      expect(TYPE_MAPPING["VARCHAR"]).toBe("string");
      expect(TYPE_MAPPING["CHAR"]).toBe("string");
      expect(TYPE_MAPPING["TEXT"]).toBe("string");
      expect(TYPE_MAPPING["TINYTEXT"]).toBe("string");
      expect(TYPE_MAPPING["MEDIUMTEXT"]).toBe("string");
      expect(TYPE_MAPPING["LONGTEXT"]).toBe("string");
      expect(TYPE_MAPPING["TIME"]).toBe("string");
    });

    it("should map date types to Date", () => {
      expect(TYPE_MAPPING["DATE"]).toBe("Date");
      expect(TYPE_MAPPING["DATETIME"]).toBe("Date");
      expect(TYPE_MAPPING["TIMESTAMP"]).toBe("Date");
    });

    it("should map binary types to Buffer", () => {
      expect(TYPE_MAPPING["BLOB"]).toBe("Buffer");
      expect(TYPE_MAPPING["TINYBLOB"]).toBe("Buffer");
      expect(TYPE_MAPPING["MEDIUMBLOB"]).toBe("Buffer");
      expect(TYPE_MAPPING["LONGBLOB"]).toBe("Buffer");
      expect(TYPE_MAPPING["BINARY"]).toBe("Buffer");
      expect(TYPE_MAPPING["VARBINARY"]).toBe("Buffer");
    });

    it("should map JSON to unknown", () => {
      expect(TYPE_MAPPING["JSON"]).toBe("unknown");
    });

    it("should map ENUM to enum", () => {
      expect(TYPE_MAPPING["ENUM"]).toBe("enum");
    });
  });

  describe("getPropertyName", () => {
    it("should return alias when present", () => {
      // GIVEN
      const column: ColumnMeta = {
        name: "user_id",
        alias: "id",
        table: "users",
        type: "INT",
        typeCode: 3,
        nullable: false,
      };

      // WHEN
      const result = getPropertyName(column);

      // THEN
      expect(result).toBe("id");
    });

    it("should return name when alias is not present", () => {
      // GIVEN
      const column: ColumnMeta = {
        name: "user_id",
        table: "users",
        type: "INT",
        typeCode: 3,
        nullable: false,
      };

      // WHEN
      const result = getPropertyName(column);

      // THEN
      expect(result).toBe("user_id");
    });

    it("should return name when alias is omitted", () => {
      // GIVEN
      const column: ColumnMeta = {
        name: "email",
        table: "users",
        type: "VARCHAR",
        typeCode: 253,
        nullable: true,
      };

      // WHEN
      const result = getPropertyName(column);

      // THEN
      expect(result).toBe("email");
    });
  });

  describe("inferColumnType", () => {
    it("should infer number type for INT column", () => {
      // GIVEN
      const column: ColumnMeta = {
        name: "id",
        table: "users",
        type: "INT",
        typeCode: 3,
        nullable: false,
      };

      // WHEN
      const result = inferColumnType(column);

      // THEN
      expect(result).toEqual({ type: "number", nullable: false });
    });

    it("should infer string type for VARCHAR column", () => {
      // GIVEN
      const column: ColumnMeta = {
        name: "name",
        table: "users",
        type: "VARCHAR",
        typeCode: 253,
        nullable: false,
      };

      // WHEN
      const result = inferColumnType(column);

      // THEN
      expect(result).toEqual({ type: "string", nullable: false });
    });

    it("should handle nullable columns", () => {
      // GIVEN
      const column: ColumnMeta = {
        name: "email",
        table: "users",
        type: "VARCHAR",
        typeCode: 253,
        nullable: true,
      };

      // WHEN
      const result = inferColumnType(column);

      // THEN
      expect(result).toEqual({ type: "string", nullable: true });
    });

    it("should infer Date type for DATETIME column", () => {
      // GIVEN
      const column: ColumnMeta = {
        name: "created_at",
        table: "users",
        type: "DATETIME",
        typeCode: 12,
        nullable: false,
      };

      // WHEN
      const result = inferColumnType(column);

      // THEN
      expect(result).toEqual({ type: "Date", nullable: false });
    });

    it("should infer string type for BIGINT column", () => {
      // GIVEN
      const column: ColumnMeta = {
        name: "big_number",
        table: "data",
        type: "BIGINT",
        typeCode: 8,
        nullable: false,
      };

      // WHEN
      const result = inferColumnType(column);

      // THEN
      expect(result).toEqual({ type: "string", nullable: false });
    });

    it("should handle ENUM type with values", () => {
      // GIVEN
      const column: ColumnMeta = {
        name: "status",
        table: "users",
        type: "ENUM",
        typeCode: 247,
        nullable: false,
        enumValues: ["pending", "active", "inactive"],
      };

      // WHEN
      const result = inferColumnType(column);

      // THEN
      expect(result).toEqual({
        type: "enum",
        nullable: false,
        enumValues: ["pending", "active", "inactive"],
      });
    });

    it("should handle unknown types", () => {
      // GIVEN
      const column: ColumnMeta = {
        name: "unknown_col",
        table: "data",
        type: "UNKNOWN_TYPE",
        typeCode: 999,
        nullable: false,
      };

      // WHEN
      const result = inferColumnType(column);

      // THEN
      expect(result).toEqual({ type: "unknown", nullable: false });
    });

    it("should handle lowercase type names", () => {
      // GIVEN
      const column: ColumnMeta = {
        name: "id",
        table: "users",
        type: "int",
        typeCode: 3,
        nullable: false,
      };

      // WHEN
      const result = inferColumnType(column);

      // THEN
      expect(result).toEqual({ type: "number", nullable: false });
    });
  });

  describe("genColumnTypeRegistry", () => {
    it("should generate registry for single column", () => {
      // GIVEN
      const metadata: QueryMeta = {
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

      // WHEN
      const result = genColumnTypeRegistry(metadata);

      // THEN
      expect(result).toEqual({
        id: { type: "number", nullable: false },
      });
    });

    it("should generate registry for multiple columns", () => {
      // GIVEN
      const metadata: QueryMeta = {
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
        ],
      };

      // WHEN
      const result = genColumnTypeRegistry(metadata);

      // THEN
      expect(result).toEqual({
        id: { type: "number", nullable: false },
        name: { type: "string", nullable: false },
        email: { type: "string", nullable: true },
      });
    });

    it("should use alias as property name when present", () => {
      // GIVEN
      const metadata: QueryMeta = {
        columns: [
          {
            name: "user_id",
            alias: "id",
            table: "users",
            type: "INT",
            typeCode: 3,
            nullable: false,
          },
          {
            name: "user_name",
            alias: "name",
            table: "users",
            type: "VARCHAR",
            typeCode: 253,
            nullable: false,
          },
        ],
      };

      // WHEN
      const result = genColumnTypeRegistry(metadata);

      // THEN
      expect(result).toEqual({
        id: { type: "number", nullable: false },
        name: { type: "string", nullable: false },
      });
    });

    it("should handle empty columns array", () => {
      // GIVEN
      const metadata: QueryMeta = {
        columns: [],
      };

      // WHEN
      const result = genColumnTypeRegistry(metadata);

      // THEN
      expect(result).toEqual({});
    });

    it("should handle ENUM columns with values", () => {
      // GIVEN
      const metadata: QueryMeta = {
        columns: [
          {
            name: "status",
            table: "users",
            type: "ENUM",
            typeCode: 247,
            nullable: false,
            enumValues: ["active", "inactive"],
          },
        ],
      };

      // WHEN
      const result = genColumnTypeRegistry(metadata);

      // THEN
      expect(result).toEqual({
        status: {
          type: "enum",
          nullable: false,
          enumValues: ["active", "inactive"],
        },
      });
    });

    it("should handle mixed column types", () => {
      // GIVEN
      const metadata: QueryMeta = {
        columns: [
          {
            name: "id",
            table: "users",
            type: "INT",
            typeCode: 3,
            nullable: false,
          },
          {
            name: "balance",
            table: "users",
            type: "DECIMAL",
            typeCode: 246,
            nullable: true,
          },
          {
            name: "created_at",
            table: "users",
            type: "TIMESTAMP",
            typeCode: 7,
            nullable: false,
          },
          {
            name: "data",
            table: "users",
            type: "JSON",
            typeCode: 245,
            nullable: true,
          },
        ],
      };

      // WHEN
      const result = genColumnTypeRegistry(metadata);

      // THEN
      expect(result).toEqual({
        id: { type: "number", nullable: false },
        balance: { type: "string", nullable: true },
        created_at: { type: "Date", nullable: false },
        data: { type: "unknown", nullable: true },
      });
    });
  });
});
