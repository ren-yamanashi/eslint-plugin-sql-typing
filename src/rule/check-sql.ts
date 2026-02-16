import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from "@typescript-eslint/utils";

import type {
  DatabaseConfig,
  DatabaseEngine,
  LibraryType,
  PluginOptions,
} from "../adapter/db/config.i";
import { getLibraryAdapter } from "../adapter/registry";
import { memoize } from "../cache/memoize";
import type { ColumnTypeInfo, ColumnTypeRegistry } from "../types/column.i";

import { workers } from "./private/worker";

// =============================================================================
// Adapter Cache
// =============================================================================

/**
 * Cache for library adapters to avoid re-creating them
 */
const libraryAdapterCache = new Map<LibraryType, ReturnType<typeof getLibraryAdapter>>();

/**
 * Get or create library adapter
 */
function getOrCreateLibraryAdapter(library: LibraryType) {
  let adapter = libraryAdapterCache.get(library);
  if (!adapter) {
    adapter = getLibraryAdapter(library);
    libraryAdapterCache.set(library, adapter);
  }
  return adapter;
}

// =============================================================================
// Memoized Query Type Fetching
// =============================================================================

/**
 * Generate cache key for SQL query and database config
 */
function getCacheKey(sql: string, config: DatabaseConfig, dbEngine: DatabaseEngine): string {
  return `${dbEngine}:${sql}:${JSON.stringify(config)}`;
}

/**
 * Get inferred types for SQL query with memoization
 */
function getInferredTypes(
  sql: string,
  config: DatabaseConfig,
  dbEngine: DatabaseEngine,
): ColumnTypeRegistry | null {
  return memoize({
    key: getCacheKey(sql, config, dbEngine),
    value: () => workers.checkSql(sql, config, dbEngine),
  });
}

// =============================================================================
// Types
// =============================================================================

/** Rule options */
type Options = [PluginOptions?];

/** Message IDs for rule errors */
type MessageIds = "missingType" | "typeMismatch" | "missingColumn" | "extraColumn";

// =============================================================================
// Type Generation
// =============================================================================

/**
 * Format type info as string for error messages
 */
function formatTypeString(typeInfo: ColumnTypeInfo): string {
  let typeStr: string;

  if (typeInfo.type === "enum" && typeInfo.enumValues) {
    typeStr = typeInfo.enumValues.map((v) => `"${v}"`).join(" | ");
  } else {
    typeStr = typeInfo.type;
  }

  if (typeInfo.nullable) {
    const nullType = (typeInfo as ColumnTypeInfo & { hasUndefined?: boolean }).hasUndefined
      ? "undefined"
      : "null";
    typeStr = `${typeStr} | ${nullType}`;
  }

  return typeStr;
}

/**
 * Generate full type annotation string
 */
function generateTypeAnnotation(columns: { name: string; typeInfo: ColumnTypeInfo }[]): string {
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
export const checkSql = ESLintUtils.RuleCreator(
  (name) => `https://github.com/ren-yamanashi/eslint-plugin-sql-typing/docs/rules/${name}`,
)<Options, MessageIds>({
  name: "check-sql",
  meta: {
    type: "problem",
    docs: {
      description: "Ensure mysql2 queries have correct TypeScript type annotations",
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          dbEngine: {
            type: "string",
            enum: ["mysql", "mariadb", "postgresql"],
            default: "mysql",
          },
          library: {
            type: "string",
            enum: ["mysql2", "prisma", "typeorm", "data-api"],
            default: "mysql2",
          },
          database: {
            type: "object",
            properties: {
              host: { type: "string" },
              port: { type: "number" },
              user: { type: "string" },
              password: { type: "string" },
              database: { type: "string" },
            },
            required: ["host", "user", "password", "database"],
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingType: "Missing type annotation for SQL query: {{ sql }}",
      typeMismatch:
        "Type mismatch for column '{{ column }}': expected {{ expected }}, got {{ actual }}",
      missingColumn: "Missing column '{{ column }}' in type annotation",
      extraColumn: "Extra column '{{ column }}' in type annotation not in query",
    },
  },
  defaultOptions: [{ dbEngine: "mysql" as DatabaseEngine, library: "mysql2" as LibraryType }],
  create(context) {
    const sourceCode = context.sourceCode.getText();
    const options = context.options[0] ?? {};
    const dbEngine = options.dbEngine ?? "mysql";
    const library = options.library ?? "mysql2";
    const databaseConfig = options.database;

    // Get the appropriate library adapter
    const libraryAdapter = getOrCreateLibraryAdapter(library);

    // Skip if no database config provided
    if (!databaseConfig) {
      return {};
    }

    return {
      CallExpression(node) {
        // Check if this is a target method call
        if (!libraryAdapter.isTargetMethod(node)) return;

        // Extract SQL from arguments
        const sql = libraryAdapter.extractSql(node);
        if (!sql) return;

        // Get inferred types from database (memoized)
        const inferredTypes = getInferredTypes(sql, databaseConfig, dbEngine);
        if (!inferredTypes) return;

        // Convert to expected columns format
        const expectedColumns: { name: string; typeInfo: ColumnTypeInfo }[] = Object.entries(
          inferredTypes,
        ).map(([name, typeInfo]) => ({
          name,
          typeInfo: typeInfo,
        }));

        // Get existing type annotation
        const existingType = libraryAdapter.getExistingTypeAnnotation(node, sourceCode);

        // Get type arguments for fix range
        const typeArgs = (
          node as TSESTree.CallExpression & {
            typeArguments?: TSESTree.TSTypeParameterInstantiation;
          }
        ).typeArguments;

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
                const importStatement = libraryAdapter.getRequiredImport() + "\n";
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
 * Check if two types match
 */
function typesMatch(expected: ColumnTypeInfo, actual: ColumnTypeInfo): boolean {
  // Check nullable
  if (expected.nullable !== actual.nullable) return false;

  // Check for undefined vs null (MySQL always uses null, never undefined)
  const actualHasUndefined = (actual as ColumnTypeInfo & { hasUndefined?: boolean }).hasUndefined;
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
