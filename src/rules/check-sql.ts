import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from "@typescript-eslint/utils";

import type { TypeInfo } from "../types/inference.js";

/** Rule options */
type Options = [];

// =============================================================================
// Mock Schema (for testing - in production, this would come from DB/config)
// =============================================================================

interface ColumnSchema {
  type: string;
  nullable: boolean;
  enumValues?: string[];
}

interface TableSchema {
  [columnName: string]: ColumnSchema;
}

interface DatabaseSchema {
  [tableName: string]: TableSchema;
}

/**
 * Mock database schema for testing
 */
const MOCK_SCHEMA: DatabaseSchema = {
  users: {
    id: { type: "number", nullable: false },
    name: { type: "string", nullable: false },
    email: { type: "string", nullable: true },
    status: {
      type: "enum",
      nullable: false,
      enumValues: ["pending", "active", "inactive"],
    },
    balance: { type: "string", nullable: false }, // DECIMAL
    created_at: { type: "Date", nullable: false },
    updated_at: { type: "Date", nullable: true },
    metadata: { type: "unknown", nullable: true }, // JSON
    age: { type: "number", nullable: true },
  },
  posts: {
    id: { type: "number", nullable: false },
    title: { type: "string", nullable: false },
    view_count: { type: "string", nullable: false }, // BIGINT
    published: { type: "number", nullable: false }, // TINYINT
    content: { type: "string", nullable: true },
    user_id: { type: "number", nullable: false },
  },
  comments: {
    id: { type: "number", nullable: false },
    body: { type: "string", nullable: false },
    post_id: { type: "number", nullable: false },
  },
};

// =============================================================================
// SQL Parsing Helpers
// =============================================================================

interface ParsedColumn {
  name: string;
  alias: string | null;
  table: string | null;
}

interface ParsedQuery {
  columns: ParsedColumn[];
  tables: string[];
}

/**
 * Parse SELECT query to extract columns and tables
 */
function parseSelectQuery(sql: string): ParsedQuery | null {
  const normalized = sql.replace(/\s+/g, " ").trim();

  // Match SELECT ... FROM ...
  const selectMatch = /^SELECT\s+(.+?)\s+FROM\s+(\S+)/i.exec(normalized);
  if (!selectMatch) return null;

  const columnsPart = selectMatch[1] ?? "";
  const tablePart = selectMatch[2] ?? "";

  // Parse table name (remove alias)
  const tableMatch = /^`?(\w+)`?/i.exec(tablePart);
  const tableName = tableMatch?.[1] ?? "";

  // Parse columns
  const columns = parseColumns(columnsPart);

  return {
    columns,
    tables: [tableName],
  };
}

/**
 * Parse column list from SELECT clause
 */
function parseColumns(columnsPart: string): ParsedColumn[] {
  if (columnsPart.trim() === "*") {
    return [{ name: "*", alias: null, table: null }];
  }

  const columns: ParsedColumn[] = [];
  const parts = splitColumns(columnsPart);

  for (const part of parts) {
    const column = parseColumn(part.trim());
    if (column) {
      columns.push(column);
    }
  }

  return columns;
}

/**
 * Split column list by comma (respecting parentheses)
 */
function splitColumns(columnsPart: string): string[] {
  const result: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of columnsPart) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current) result.push(current);

  return result;
}

/**
 * Parse a single column expression
 */
function parseColumn(expr: string): ParsedColumn | null {
  // Handle AS alias
  const asMatch = /^(.+?)\s+AS\s+`?(\w+)`?$/i.exec(expr);
  if (asMatch) {
    const columnExpr = asMatch[1]?.trim() ?? "";
    const alias = asMatch[2] ?? "";
    const baseColumn = parseColumnExpr(columnExpr);
    return {
      name: baseColumn.name,
      alias,
      table: baseColumn.table,
    };
  }

  return parseColumnExpr(expr);
}

/**
 * Parse column expression (table.column or just column)
 */
function parseColumnExpr(expr: string): ParsedColumn {
  const trimmed = expr.trim().replace(/`/g, "");

  // Handle table.column
  const dotMatch = /^(\w+)\.(\w+)$/.exec(trimmed);
  if (dotMatch) {
    return {
      name: dotMatch[2] ?? "",
      alias: null,
      table: dotMatch[1] ?? null,
    };
  }

  return {
    name: trimmed,
    alias: null,
    table: null,
  };
}

// =============================================================================
// Type Annotation Parsing
// =============================================================================

interface ParsedTypeAnnotation {
  columns: Record<string, TypeInfo>;
}

/**
 * Parse type annotation from AST
 */
function parseTypeAnnotation(
  typeArgs: TSESTree.TSTypeParameterInstantiation | undefined,
  sourceCode: string,
): ParsedTypeAnnotation | null {
  if (!typeArgs?.params?.length) return null;

  const firstParam = typeArgs.params[0];
  if (!firstParam) return null;

  // Get the source text of the type
  const typeText = sourceCode.slice(firstParam.range[0], firstParam.range[1]);

  return parseTypeString(typeText);
}

/**
 * Parse type string to extract column types
 */
function parseTypeString(typeStr: string): ParsedTypeAnnotation {
  const columns: Record<string, TypeInfo> = {};

  // Extract content between { and }
  const match = /\{\s*([^}]+)\s*\}/.exec(typeStr);
  if (!match?.[1]) return { columns };

  const content = match[1];

  // Parse each column: "name: type" or "name: type | null"
  const columnParts = content
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const part of columnParts) {
    const colonIndex = part.indexOf(":");
    if (colonIndex === -1) continue;

    const name = part.slice(0, colonIndex).trim();
    const typeExpr = part.slice(colonIndex + 1).trim();

    const typeInfo = parseTypeExpression(typeExpr);
    columns[name] = typeInfo;
  }

  return { columns };
}

/**
 * Parse a single type expression
 */
function parseTypeExpression(typeExpr: string): TypeInfo {
  const hasNull = typeExpr.endsWith(" | null");
  const hasUndefined = typeExpr.endsWith(" | undefined");
  const nullable = hasNull || hasUndefined;
  const cleanExpr = typeExpr.replace(/\s*\|\s*(null|undefined)\s*$/, "").trim();

  // Check for enum (union of string literals)
  if (cleanExpr.includes('"')) {
    const enumValues = extractEnumValues(cleanExpr);
    if (enumValues.length > 0) {
      return {
        type: "enum",
        nullable,
        enumValues,
        ...(hasUndefined && { hasUndefined: true }),
      };
    }
  }

  return {
    type: cleanExpr,
    nullable,
    ...(hasUndefined && { hasUndefined: true }),
  };
}

/**
 * Extract enum values from union type string
 */
function extractEnumValues(typeExpr: string): string[] {
  const values: string[] = [];
  const regex = /"([^"]+)"/g;
  let match;
  while ((match = regex.exec(typeExpr)) !== null) {
    if (match[1]) {
      values.push(match[1]);
    }
  }
  return values;
}

// =============================================================================
// Type Generation
// =============================================================================

/**
 * Generate expected type info for a column
 */
function getExpectedType(columnName: string, tableName: string): TypeInfo | null {
  const table = MOCK_SCHEMA[tableName];
  if (!table) return null;

  const column = table[columnName];
  if (!column) return null;

  return {
    type: column.type,
    nullable: column.nullable,
    ...(column.enumValues && { enumValues: column.enumValues }),
  };
}

/**
 * Format type info as string for error messages
 */
function formatTypeString(typeInfo: TypeInfo): string {
  let typeStr: string;

  if (typeInfo.type === "enum" && typeInfo.enumValues) {
    typeStr = typeInfo.enumValues.map((v) => `"${v}"`).join(" | ");
  } else {
    typeStr = typeInfo.type;
  }

  if (typeInfo.nullable) {
    const nullType = (typeInfo as TypeInfo & { hasUndefined?: boolean }).hasUndefined
      ? "undefined"
      : "null";
    typeStr = `${typeStr} | ${nullType}`;
  }

  return typeStr;
}

/**
 * Generate full type annotation string
 */
function generateTypeAnnotation(columns: { name: string; typeInfo: TypeInfo }[]): string {
  const props = columns.map(({ name, typeInfo }) => {
    const typeStr = formatTypeString(typeInfo);
    return `${name}: ${typeStr}`;
  });

  return `(RowDataPacket & { ${props.join("; ")} })[]`;
}

// =============================================================================
// Rule Implementation
// =============================================================================

/**
 * Create the check-sql ESLint rule
 */
export const checkSqlRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/example/eslint-plugin-sql-typing/docs/rules/${name}`,
)({
  name: "check-sql",
  meta: {
    type: "problem",
    docs: {
      description: "Ensure mysql2 queries have correct TypeScript type annotations",
    },
    fixable: "code",
    schema: [],
    messages: {
      missingType: "Missing type annotation for SQL query: {{ sql }}",
      typeMismatch:
        "Type mismatch for column '{{ column }}': expected {{ expected }}, got {{ actual }}",
      missingColumn: "Missing column '{{ column }}' in type annotation",
      extraColumn: "Extra column '{{ column }}' in type annotation not in query",
    },
  },
  defaultOptions: [] as Options,
  create(context) {
    const sourceCode = context.sourceCode.getText();

    return {
      CallExpression(node) {
        // Check if this is a mysql2 method call
        if (!isMySQL2Call(node)) return;

        // Extract SQL from arguments
        const sql = extractSql(node);
        if (!sql) return;

        // Parse the SQL query
        const parsed = parseSelectQuery(sql);
        if (!parsed) return;

        // Get the table name
        const tableName = parsed.tables[0];
        if (!tableName) return;

        // Handle SELECT *
        let queryColumns = parsed.columns;
        if (queryColumns.length === 1 && queryColumns[0]?.name === "*") {
          const table = MOCK_SCHEMA[tableName];
          if (!table) return;
          queryColumns = Object.keys(table).map((name) => ({
            name,
            alias: null,
            table: null,
          }));
        }

        // Get expected types for each column
        const expectedColumns: { name: string; typeInfo: TypeInfo }[] = [];
        for (const col of queryColumns) {
          const columnName = col.alias ?? col.name;
          const originalName = col.name;
          const typeInfo = getExpectedType(originalName, tableName);
          if (typeInfo) {
            expectedColumns.push({ name: columnName, typeInfo });
          }
        }

        // Get existing type annotation
        const typeArgs = (
          node as TSESTree.CallExpression & {
            typeArguments?: TSESTree.TSTypeParameterInstantiation;
          }
        ).typeArguments;
        const existingType = parseTypeAnnotation(typeArgs, sourceCode);

        // Check for missing type annotation
        if (!existingType) {
          context.report({
            node,
            messageId: "missingType",
            data: { sql: sql.replace(/\s+/g, " ").trim() },
            fix: (fixer) => {
              const fixes: ReturnType<typeof fixer.insertTextAfter>[] = [];

              // Generate type annotation
              const typeAnnotation = generateTypeAnnotation(expectedColumns);

              // Insert type parameter after method name
              const callee = node.callee;
              if (callee.type === AST_NODE_TYPES.MemberExpression) {
                fixes.push(fixer.insertTextAfter(callee, `<${typeAnnotation}>`));
              }

              // Add import if needed
              if (!sourceCode.includes("RowDataPacket")) {
                const importStatement = "import type { RowDataPacket } from 'mysql2/promise';\n";
                // Find first import or top of file
                const firstToken = context.sourceCode.ast.body[0];
                if (firstToken) {
                  // Find last import
                  let lastImport: TSESTree.Node | null = null;
                  for (const statement of context.sourceCode.ast.body) {
                    if (statement.type === AST_NODE_TYPES.ImportDeclaration) {
                      lastImport = statement;
                    }
                  }
                  if (lastImport) {
                    fixes.push(fixer.insertTextAfter(lastImport, "\n" + importStatement.trim()));
                  } else {
                    fixes.push(fixer.insertTextBefore(firstToken, importStatement));
                  }
                }
              }

              return fixes;
            },
          });
          return;
        }

        // Compare types
        const expectedMap = new Map(expectedColumns.map((c) => [c.name, c.typeInfo]));
        const actualMap = new Map(Object.entries(existingType.columns));

        // Check for missing columns in type annotation
        for (const [name, typeInfo] of expectedMap) {
          if (!actualMap.has(name)) {
            context.report({
              node,
              messageId: "missingColumn",
              data: { column: name },
              fix: (fixer) => {
                // Add the missing column to the type
                const newType = generateTypeAnnotation([
                  ...Object.entries(existingType.columns).map(([n, t]) => ({
                    name: n,
                    typeInfo: t,
                  })),
                  { name, typeInfo },
                ]);
                if (typeArgs) {
                  return fixer.replaceTextRange(
                    [typeArgs.range[0], typeArgs.range[1]],
                    `<${newType}>`,
                  );
                }
                return null;
              },
            });
          }
        }

        // Check for extra columns in type annotation
        for (const name of actualMap.keys()) {
          if (!expectedMap.has(name)) {
            context.report({
              node,
              messageId: "extraColumn",
              data: { column: name },
              fix: (fixer) => {
                // Remove the extra column from the type
                const newColumns = Object.entries(existingType.columns)
                  .filter(([n]) => n !== name)
                  .map(([n, t]) => ({ name: n, typeInfo: t }));
                const newType = generateTypeAnnotation(newColumns);
                if (typeArgs) {
                  return fixer.replaceTextRange(
                    [typeArgs.range[0], typeArgs.range[1]],
                    `<${newType}>`,
                  );
                }
                return null;
              },
            });
          }
        }

        // Check for type mismatches
        for (const [name, expectedType] of expectedMap) {
          const actualType = actualMap.get(name);
          if (!actualType) continue;

          if (!typesMatch(expectedType, actualType)) {
            context.report({
              node,
              messageId: "typeMismatch",
              data: {
                column: name,
                expected: formatTypeString(expectedType),
                actual: formatTypeString(actualType),
              },
              fix: (fixer) => {
                // Replace the type annotation with correct types
                const newType = generateTypeAnnotation(expectedColumns);
                if (typeArgs) {
                  return fixer.replaceTextRange(
                    [typeArgs.range[0], typeArgs.range[1]],
                    `<${newType}>`,
                  );
                }
                return null;
              },
            });
          }
        }
      },
    };
  },
});

/**
 * Check if node is a mysql2 method call
 */
function isMySQL2Call(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;
  if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
  if (callee.property.type !== AST_NODE_TYPES.Identifier) return false;

  const methodName = callee.property.name;
  return methodName === "execute" || methodName === "query";
}

/**
 * Extract SQL string from call arguments
 */
function extractSql(node: TSESTree.CallExpression): string | null {
  const args = node.arguments;
  if (args.length === 0) return null;

  const firstArg = args[0];
  if (!firstArg) return null;

  // Handle string literal
  if (firstArg.type === AST_NODE_TYPES.Literal && typeof firstArg.value === "string") {
    return firstArg.value;
  }

  // Handle template literal without expressions
  if (firstArg.type === AST_NODE_TYPES.TemplateLiteral) {
    if (firstArg.expressions.length > 0) return null;
    return firstArg.quasis.map((q) => q.value.cooked ?? q.value.raw).join("");
  }

  return null;
}

/**
 * Check if two types match
 */
function typesMatch(expected: TypeInfo, actual: TypeInfo): boolean {
  // Check nullable
  if (expected.nullable !== actual.nullable) return false;

  // Check for undefined vs null (MySQL always uses null, never undefined)
  const actualHasUndefined = (actual as TypeInfo & { hasUndefined?: boolean }).hasUndefined;
  if (expected.nullable && actualHasUndefined) {
    // Using undefined instead of null is incorrect
    return false;
  }

  // Check base type
  if (expected.type === "enum" && actual.type === "enum") {
    // Compare enum values
    const expectedValues = expected.enumValues ?? [];
    const actualValues = actual.enumValues ?? [];
    if (expectedValues.length !== actualValues.length) return false;
    return expectedValues.every((v) => actualValues.includes(v));
  }

  return expected.type === actual.type;
}
