/**
 * mysql2 Library Adapter Unit Tests
 *
 * These tests verify the mysql2 library adapter correctly:
 * - Detects mysql2 method calls (execute, query)
 * - Extracts SQL strings from AST
 * - Parses existing type annotations
 * - Generates correct type annotation fixes
 */

import { describe, it, expect } from "vitest";
import { MySQL2Adapter } from "../../src/adapters/mysql2-library-adapter.js";
import type { TSESTree } from "@typescript-eslint/types";

describe("mysql2 Library Adapter", () => {
  const adapter = new MySQL2Adapter();

  // =========================================================================
  // Method Detection
  // =========================================================================

  describe("Method Detection", () => {
    it("should detect pool.execute call", () => {
      const callExpr = createMockCallExpression("pool", "execute");

      expect(adapter.isTargetMethod(callExpr)).toBe(true);
    });

    it("should detect pool.query call", () => {
      const callExpr = createMockCallExpression("pool", "query");

      expect(adapter.isTargetMethod(callExpr)).toBe(true);
    });

    it("should detect connection.execute call", () => {
      const callExpr = createMockCallExpression("connection", "execute");

      expect(adapter.isTargetMethod(callExpr)).toBe(true);
    });

    it("should detect conn.query call", () => {
      const callExpr = createMockCallExpression("conn", "query");

      expect(adapter.isTargetMethod(callExpr)).toBe(true);
    });

    it("should not detect other method calls", () => {
      const callExpr = createMockCallExpression("pool", "end");

      expect(adapter.isTargetMethod(callExpr)).toBe(false);
    });

    it("should not detect function calls", () => {
      const callExpr = createMockFunctionCall("execute");

      expect(adapter.isTargetMethod(callExpr)).toBe(false);
    });
  });

  // =========================================================================
  // SQL Extraction
  // =========================================================================

  describe("SQL Extraction", () => {
    it("should extract SQL from string literal", () => {
      const callExpr = createMockCallWithSql("pool", "execute", "SELECT id FROM users");

      const sql = adapter.extractSql(callExpr);

      expect(sql).toBe("SELECT id FROM users");
    });

    it("should extract SQL from template literal without expressions", () => {
      const callExpr = createMockCallWithTemplateLiteral("pool", "execute", "SELECT id FROM users");

      const sql = adapter.extractSql(callExpr);

      expect(sql).toBe("SELECT id FROM users");
    });

    it("should return null for template literal with expressions", () => {
      const callExpr = createMockCallWithTemplateExpression(
        "pool",
        "execute",
        ["SELECT id FROM users WHERE id = ", ""],
        ["userId"],
      );

      const sql = adapter.extractSql(callExpr);

      expect(sql).toBeNull();
    });

    it("should return null for variable reference", () => {
      const callExpr = createMockCallWithVariable("pool", "execute", "sqlQuery");

      const sql = adapter.extractSql(callExpr);

      expect(sql).toBeNull();
    });

    it("should handle multiline SQL", () => {
      const callExpr = createMockCallWithSql(
        "pool",
        "execute",
        `
        SELECT
          id,
          name
        FROM users
        WHERE status = 'active'
      `,
      );

      const sql = adapter.extractSql(callExpr);

      expect(sql).toContain("SELECT");
      expect(sql).toContain("FROM users");
    });
  });

  // =========================================================================
  // Type Annotation Parsing
  // =========================================================================

  describe("Type Annotation Parsing", () => {
    it("should detect missing type annotation", () => {
      const callExpr = createMockCallWithSql("pool", "execute", "SELECT id FROM users");

      const typeInfo = adapter.getExistingTypeAnnotation(callExpr);

      expect(typeInfo).toBeNull();
    });

    it("should parse existing type annotation", () => {
      const callExpr = createMockCallWithTypeAnnotation(
        "pool",
        "execute",
        "SELECT id FROM users",
        "(RowDataPacket & { id: number })[]",
      );

      const typeInfo = adapter.getExistingTypeAnnotation(callExpr);

      expect(typeInfo).not.toBeNull();
      expect(typeInfo?.columns).toEqual({
        id: { type: "number", nullable: false },
      });
    });

    it("should parse nullable column types", () => {
      const callExpr = createMockCallWithTypeAnnotation(
        "pool",
        "execute",
        "SELECT email FROM users",
        "(RowDataPacket & { email: string | null })[]",
      );

      const typeInfo = adapter.getExistingTypeAnnotation(callExpr);

      expect(typeInfo?.columns).toEqual({
        email: { type: "string", nullable: true },
      });
    });

    it("should parse ENUM union types", () => {
      const callExpr = createMockCallWithTypeAnnotation(
        "pool",
        "execute",
        "SELECT status FROM users",
        '(RowDataPacket & { status: "pending" | "active" | "inactive" })[]',
      );

      const typeInfo = adapter.getExistingTypeAnnotation(callExpr);

      expect(typeInfo?.columns).toEqual({
        status: {
          type: "enum",
          nullable: false,
          enumValues: ["pending", "active", "inactive"],
        },
      });
    });

    it("should parse multiple columns", () => {
      const callExpr = createMockCallWithTypeAnnotation(
        "pool",
        "execute",
        "SELECT id, name, email FROM users",
        "(RowDataPacket & { id: number; name: string; email: string | null })[]",
      );

      const typeInfo = adapter.getExistingTypeAnnotation(callExpr);

      expect(typeInfo?.columns).toEqual({
        id: { type: "number", nullable: false },
        name: { type: "string", nullable: false },
        email: { type: "string", nullable: true },
      });
    });
  });

  // =========================================================================
  // Fix Generation
  // =========================================================================

  describe("Fix Generation", () => {
    it("should generate fix for missing type annotation", () => {
      const callExpr = createMockCallWithSql("pool", "execute", "SELECT id FROM users");
      const expectedType = "(RowDataPacket & { id: number })[]";

      const fix = adapter.generateFix(callExpr, expectedType);

      expect(fix).toBeDefined();
      expect(fix.text).toBe(`<${expectedType}>`);
    });

    it("should generate fix for wrong type annotation", () => {
      const callExpr = createMockCallWithTypeAnnotation(
        "pool",
        "execute",
        "SELECT id FROM users",
        "(RowDataPacket & { id: string })[]", // Wrong: should be number
      );
      const expectedType = "(RowDataPacket & { id: number })[]";

      const fix = adapter.generateFix(callExpr, expectedType);

      expect(fix).toBeDefined();
      expect(fix.text).toBe(`<${expectedType}>`);
    });
  });

  // =========================================================================
  // Options Detection
  // =========================================================================

  describe("Options Detection", () => {
    it("should detect nestTables option", () => {
      const callExpr = createMockCallWithOptions("pool", "execute", {
        nestTables: true,
      });

      const options = adapter.getQueryOptions(callExpr);

      expect(options.nestTables).toBe(true);
    });

    it("should detect rowsAsArray option", () => {
      const callExpr = createMockCallWithOptions("pool", "execute", {
        rowsAsArray: true,
      });

      const options = adapter.getQueryOptions(callExpr);

      expect(options.rowsAsArray).toBe(true);
    });

    it("should return default options when none specified", () => {
      const callExpr = createMockCallWithSql("pool", "execute", "SELECT id FROM users");

      const options = adapter.getQueryOptions(callExpr);

      expect(options.nestTables).toBe(false);
      expect(options.rowsAsArray).toBe(false);
    });
  });

  // =========================================================================
  // Import Detection
  // =========================================================================

  describe("Import Detection", () => {
    it("should check if RowDataPacket import exists", () => {
      // This would check the AST's import declarations
      expect(adapter.hasRowDataPacketImport).toBeDefined();
    });

    it("should generate import statement", () => {
      const importStatement = adapter.getRequiredImport();

      expect(importStatement).toBe("import type { RowDataPacket } from 'mysql2/promise';");
    });
  });
});

// =========================================================================
// Mock Helpers
// =========================================================================

function createMockCallExpression(objectName: string, methodName: string): TSESTree.CallExpression {
  return {
    type: "CallExpression",
    callee: {
      type: "MemberExpression",
      object: {
        type: "Identifier",
        name: objectName,
      },
      property: {
        type: "Identifier",
        name: methodName,
      },
      computed: false,
    },
    arguments: [],
    optional: false,
  } as unknown as TSESTree.CallExpression;
}

function createMockFunctionCall(functionName: string): TSESTree.CallExpression {
  return {
    type: "CallExpression",
    callee: {
      type: "Identifier",
      name: functionName,
    },
    arguments: [],
    optional: false,
  } as unknown as TSESTree.CallExpression;
}

function createMockCallWithSql(
  objectName: string,
  methodName: string,
  sql: string,
): TSESTree.CallExpression {
  return {
    type: "CallExpression",
    callee: {
      type: "MemberExpression",
      object: {
        type: "Identifier",
        name: objectName,
      },
      property: {
        type: "Identifier",
        name: methodName,
      },
      computed: false,
    },
    arguments: [
      {
        type: "Literal",
        value: sql,
        raw: `"${sql}"`,
      },
    ],
    optional: false,
  } as unknown as TSESTree.CallExpression;
}

function createMockCallWithTemplateLiteral(
  objectName: string,
  methodName: string,
  sql: string,
): TSESTree.CallExpression {
  return {
    type: "CallExpression",
    callee: {
      type: "MemberExpression",
      object: {
        type: "Identifier",
        name: objectName,
      },
      property: {
        type: "Identifier",
        name: methodName,
      },
      computed: false,
    },
    arguments: [
      {
        type: "TemplateLiteral",
        quasis: [
          {
            type: "TemplateElement",
            value: { raw: sql, cooked: sql },
            tail: true,
          },
        ],
        expressions: [],
      },
    ],
    optional: false,
  } as unknown as TSESTree.CallExpression;
}

function createMockCallWithTemplateExpression(
  objectName: string,
  methodName: string,
  quasis: string[],
  expressions: string[],
): TSESTree.CallExpression {
  return {
    type: "CallExpression",
    callee: {
      type: "MemberExpression",
      object: {
        type: "Identifier",
        name: objectName,
      },
      property: {
        type: "Identifier",
        name: methodName,
      },
      computed: false,
    },
    arguments: [
      {
        type: "TemplateLiteral",
        quasis: quasis.map((q, i) => ({
          type: "TemplateElement",
          value: { raw: q, cooked: q },
          tail: i === quasis.length - 1,
        })),
        expressions: expressions.map((e) => ({
          type: "Identifier",
          name: e,
        })),
      },
    ],
    optional: false,
  } as unknown as TSESTree.CallExpression;
}

function createMockCallWithVariable(
  objectName: string,
  methodName: string,
  variableName: string,
): TSESTree.CallExpression {
  return {
    type: "CallExpression",
    callee: {
      type: "MemberExpression",
      object: {
        type: "Identifier",
        name: objectName,
      },
      property: {
        type: "Identifier",
        name: methodName,
      },
      computed: false,
    },
    arguments: [
      {
        type: "Identifier",
        name: variableName,
      },
    ],
    optional: false,
  } as unknown as TSESTree.CallExpression;
}

function createMockCallWithTypeAnnotation(
  objectName: string,
  methodName: string,
  sql: string,
  typeAnnotation: string,
): TSESTree.CallExpression {
  // This creates a mock with type parameters like pool.execute<Type>(sql)
  return {
    type: "CallExpression",
    callee: {
      type: "MemberExpression",
      object: {
        type: "Identifier",
        name: objectName,
      },
      property: {
        type: "Identifier",
        name: methodName,
      },
      computed: false,
    },
    typeArguments: {
      type: "TSTypeParameterInstantiation",
      params: [
        // Mock type annotation - actual parsing would be more complex
        { _typeAnnotationString: typeAnnotation },
      ],
    },
    arguments: [
      {
        type: "Literal",
        value: sql,
        raw: `"${sql}"`,
      },
    ],
    optional: false,
  } as unknown as TSESTree.CallExpression;
}

function createMockCallWithOptions(
  objectName: string,
  methodName: string,
  options: { nestTables?: boolean; rowsAsArray?: boolean },
): TSESTree.CallExpression {
  return {
    type: "CallExpression",
    callee: {
      type: "MemberExpression",
      object: {
        type: "Identifier",
        name: objectName,
      },
      property: {
        type: "Identifier",
        name: methodName,
      },
      computed: false,
    },
    arguments: [
      {
        type: "ObjectExpression",
        properties: [
          {
            type: "Property",
            key: { type: "Identifier", name: "sql" },
            value: { type: "Literal", value: "SELECT id FROM users" },
          },
          ...(options.nestTables !== undefined
            ? [
                {
                  type: "Property",
                  key: { type: "Identifier", name: "nestTables" },
                  value: { type: "Literal", value: options.nestTables },
                },
              ]
            : []),
          ...(options.rowsAsArray !== undefined
            ? [
                {
                  type: "Property",
                  key: { type: "Identifier", name: "rowsAsArray" },
                  value: { type: "Literal", value: options.rowsAsArray },
                },
              ]
            : []),
        ],
      },
    ],
    optional: false,
  } as unknown as TSESTree.CallExpression;
}
