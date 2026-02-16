import type { TSESTree } from "@typescript-eslint/utils";
import { describe, expect, it } from "vitest";

import { MySQL2Adapter } from "./mysql2";

describe("mysql2 Library Adapter", () => {
  const adapter = new MySQL2Adapter();

  describe("Method Detection", () => {
    it("should detect pool.execute call", () => {
      // GIVEN
      const callExpr = createMockCallExpression("pool", "execute");

      // WHEN
      const result = adapter.isTargetMethod(callExpr);

      // THEN
      expect(result).toBe(true);
    });

    it("should detect pool.query call", () => {
      // GIVEN
      const callExpr = createMockCallExpression("pool", "query");

      // WHEN
      const result = adapter.isTargetMethod(callExpr);

      // THEN
      expect(result).toBe(true);
    });

    it("should detect connection.execute call", () => {
      // GIVEN
      const callExpr = createMockCallExpression("connection", "execute");

      // WHEN
      const result = adapter.isTargetMethod(callExpr);

      // THEN
      expect(result).toBe(true);
    });

    it("should detect conn.query call", () => {
      // GIVEN
      const callExpr = createMockCallExpression("conn", "query");

      // WHEN
      const result = adapter.isTargetMethod(callExpr);

      // THEN
      expect(result).toBe(true);
    });

    it("should not detect other method calls", () => {
      // GIVEN
      const callExpr = createMockCallExpression("pool", "end");

      // WHEN
      const result = adapter.isTargetMethod(callExpr);

      // THEN
      expect(result).toBe(false);
    });

    it("should not detect function calls", () => {
      // GIVEN
      const callExpr = createMockFunctionCall("execute");

      // WHEN
      const result = adapter.isTargetMethod(callExpr);

      // THEN
      expect(result).toBe(false);
    });
  });

  describe("SQL Extraction", () => {
    it("should extract SQL from string literal", () => {
      // GIVEN
      const callExpr = createMockCallWithSql("pool", "execute", "SELECT id FROM users");

      // WHEN
      const sql = adapter.extractSql(callExpr);

      // THEN
      expect(sql).toBe("SELECT id FROM users");
    });

    it("should extract SQL from template literal without expressions", () => {
      // GIVEN
      const callExpr = createMockCallWithTemplateLiteral("pool", "execute", "SELECT id FROM users");

      // WHEN
      const sql = adapter.extractSql(callExpr);

      // THEN
      expect(sql).toBe("SELECT id FROM users");
    });

    it("should return null for template literal with expressions", () => {
      // GIVEN
      const callExpr = createMockCallWithTemplateExpression(
        "pool",
        "execute",
        ["SELECT id FROM users WHERE id = ", ""],
        ["userId"],
      );

      // WHEN
      const sql = adapter.extractSql(callExpr);

      // THEN
      expect(sql).toBeNull();
    });

    it("should return null for variable reference", () => {
      // GIVEN
      const callExpr = createMockCallWithVariable("pool", "execute", "sqlQuery");

      // WHEN
      const sql = adapter.extractSql(callExpr);

      // THEN
      expect(sql).toBeNull();
    });

    it("should handle multiline SQL", () => {
      // GIVEN
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

      // WHEN
      const sql = adapter.extractSql(callExpr);

      // THEN
      expect(sql).toContain("SELECT");
      expect(sql).toContain("FROM users");
    });
  });

  describe("Type Annotation Parsing", () => {
    it("should detect missing type annotation", () => {
      // GIVEN
      const callExpr = createMockCallWithSql("pool", "execute", "SELECT id FROM users");

      // WHEN
      const typeInfo = adapter.getExistingTypeAnnotation(callExpr);

      // THEN
      expect(typeInfo).toBeNull();
    });

    it("should parse existing type annotation", () => {
      // GIVEN
      const callExpr = createMockCallWithTypeAnnotation(
        "pool",
        "execute",
        "SELECT id FROM users",
        "(RowDataPacket & { id: number })[]",
      );

      // WHEN
      const typeInfo = adapter.getExistingTypeAnnotation(callExpr);

      // THEN
      expect(typeInfo).not.toBeNull();
      expect(typeInfo?.columns).toEqual({
        id: { type: "number", nullable: false },
      });
    });

    it("should parse nullable column types", () => {
      // GIVEN
      const callExpr = createMockCallWithTypeAnnotation(
        "pool",
        "execute",
        "SELECT email FROM users",
        "(RowDataPacket & { email: string | null })[]",
      );

      // WHEN
      const typeInfo = adapter.getExistingTypeAnnotation(callExpr);

      // THEN
      expect(typeInfo?.columns).toEqual({
        email: { type: "string", nullable: true },
      });
    });

    it("should parse ENUM union types", () => {
      // GIVEN
      const callExpr = createMockCallWithTypeAnnotation(
        "pool",
        "execute",
        "SELECT status FROM users",
        '(RowDataPacket & { status: "pending" | "active" | "inactive" })[]',
      );

      // WHEN
      const typeInfo = adapter.getExistingTypeAnnotation(callExpr);

      // THEN
      expect(typeInfo?.columns).toEqual({
        status: {
          type: "enum",
          nullable: false,
          enumValues: ["pending", "active", "inactive"],
        },
      });
    });

    it("should parse multiple columns", () => {
      // GIVEN
      const callExpr = createMockCallWithTypeAnnotation(
        "pool",
        "execute",
        "SELECT id, name, email FROM users",
        "(RowDataPacket & { id: number; name: string; email: string | null })[]",
      );

      // WHEN
      const typeInfo = adapter.getExistingTypeAnnotation(callExpr);

      // THEN
      expect(typeInfo?.columns).toEqual({
        id: { type: "number", nullable: false },
        name: { type: "string", nullable: false },
        email: { type: "string", nullable: true },
      });
    });
  });

  describe("Fix Generation", () => {
    it("should generate fix for missing type annotation", () => {
      // GIVEN
      const callExpr = createMockCallWithSql("pool", "execute", "SELECT id FROM users");
      const expectedType = "(RowDataPacket & { id: number })[]";

      // WHEN
      const fix = adapter.generateFix(callExpr, expectedType);

      // THEN
      expect(fix).toBeDefined();
      expect(fix.text).toBe(`<${expectedType}>`);
    });

    it("should generate fix for wrong type annotation", () => {
      // GIVEN
      const callExpr = createMockCallWithTypeAnnotation(
        "pool",
        "execute",
        "SELECT id FROM users",
        "(RowDataPacket & { id: string })[]", // Wrong: should be number
      );
      const expectedType = "(RowDataPacket & { id: number })[]";

      // WHEN
      const fix = adapter.generateFix(callExpr, expectedType);

      // THEN
      expect(fix).toBeDefined();
      expect(fix.text).toBe(`<${expectedType}>`);
    });
  });

  describe("Options Detection", () => {
    it("should detect nestTables option", () => {
      // GIVEN
      const callExpr = createMockCallWithOptions("pool", "execute", {
        nestTables: true,
      });

      // WHEN
      const options = adapter.getQueryOptions(callExpr);

      // THEN
      expect(options.nestTables).toBe(true);
    });

    it("should detect rowsAsArray option", () => {
      // GIVEN
      const callExpr = createMockCallWithOptions("pool", "execute", {
        rowsAsArray: true,
      });

      // WHEN
      const options = adapter.getQueryOptions(callExpr);

      // THEN
      expect(options.rowsAsArray).toBe(true);
    });

    it("should return default options when none specified", () => {
      // GIVEN
      const callExpr = createMockCallWithSql("pool", "execute", "SELECT id FROM users");

      // WHEN
      const options = adapter.getQueryOptions(callExpr);

      // THEN
      expect(options.nestTables).toBe(false);
      expect(options.rowsAsArray).toBe(false);
    });
  });

  describe("Import Detection", () => {
    it("should check if RowDataPacket import exists", () => {
      // GIVEN
      // adapter has hasRowDataPacketImport method

      // WHEN
      const hasMethod = typeof adapter.hasRowDataPacketImport;

      // THEN
      expect(hasMethod).toBe("function");
    });

    it("should generate import statement", () => {
      // GIVEN
      // adapter has getRequiredImport method

      // WHEN
      const importStatement = adapter.getRequiredImport();

      // THEN
      expect(importStatement).toBe("import type { RowDataPacket } from 'mysql2/promise';");
    });
  });
});

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
      range: [0, 20],
    },
    arguments: [
      {
        type: "Literal",
        value: sql,
        raw: `"${sql}"`,
      },
    ],
    optional: false,
    range: [0, 50],
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
      range: [0, 20],
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
    range: [0, 50],
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
