import { runAsWorker } from "synckit";

import type { DatabaseConfig, DatabaseEngine } from "../adapter/db/config.i";
import type { IDatabaseAdapter } from "../adapter/db/db.i";
import { MySQLAdapter } from "../adapter/db/mysql";
import { getDatabaseAdapter } from "../adapter/registry";
import type { ColumnTypeInfo, ColumnTypeRegistry } from "../types/column.i";
import type { ColumnMeta, QueryMeta } from "../types/meta.i";

/** MySQL type to TypeScript type mapping */
export const TYPE_MAPPING: Record<string, string> = {
  // Integer types
  TINYINT: "number",
  SMALLINT: "number",
  MEDIUMINT: "number",
  INT: "number",
  YEAR: "number",
  FLOAT: "number",
  DOUBLE: "number",

  // Large number types (use string for precision)
  BIGINT: "string",
  DECIMAL: "string",

  // String types
  VARCHAR: "string",
  CHAR: "string",
  TEXT: "string",
  TINYTEXT: "string",
  MEDIUMTEXT: "string",
  LONGTEXT: "string",
  TIME: "string",

  // Date types
  DATE: "Date",
  DATETIME: "Date",
  TIMESTAMP: "Date",

  // Binary types
  BLOB: "Buffer",
  TINYBLOB: "Buffer",
  MEDIUMBLOB: "Buffer",
  LONGBLOB: "Buffer",
  BINARY: "Buffer",
  VARBINARY: "Buffer",

  // JSON type
  JSON: "unknown",

  // ENUM is handled separately
  ENUM: "enum",
};

/** Cached database adapter */
let cachedAdapter: IDatabaseAdapter | null = null;
let cachedConfigHash: string | null = null;

/**
 * Get or create database adapter with connection pooling
 */
async function getAdapter(
  dbEngine: DatabaseEngine,
  config: DatabaseConfig,
): Promise<IDatabaseAdapter> {
  const configHash = `${dbEngine}:${JSON.stringify(config)}`;

  if (cachedAdapter && cachedConfigHash === configHash) {
    return cachedAdapter;
  }

  // Close previous adapter if config changed
  if (cachedAdapter) {
    await cachedAdapter.disconnect();
  }

  const adapter = getDatabaseAdapter(dbEngine, config);
  await adapter.connect();

  cachedAdapter = adapter;
  cachedConfigHash = configHash;

  return adapter;
}

/** Worker handler type */
export type CheckSQLWorkerHandler = typeof getQueryTypes;

/**
 * Get inferred types for a SQL query
 */
async function getQueryTypes(
  sql: string,
  config: DatabaseConfig,
  dbEngine: DatabaseEngine = "mysql",
): Promise<ColumnTypeRegistry | null> {
  // Skip non-SELECT queries
  if (!MySQLAdapter.isSelectQuery(sql)) {
    return null;
  }

  try {
    const adapter = await getAdapter(dbEngine, config);
    const metadata = await adapter.getQueryMetadata(sql);
    return genColumnTypeRegistry(metadata);
  } catch (error) {
    // Return null on error (e.g., invalid SQL, connection issues)
    console.error("[eslint-plugin-sql-typing] Error fetching query metadata:", error);
    return null;
  }
}

/**
 * Generate column type registry from query metadata
 */
export function genColumnTypeRegistry(metadata: QueryMeta): ColumnTypeRegistry {
  const result: ColumnTypeRegistry = {};

  for (const column of metadata.columns) {
    const propertyName = getPropertyName(column);
    const typeInfo = inferColumnType(column);
    result[propertyName] = typeInfo;
  }

  return result;
}

/**
 * Get property name for a column (use alias if present)
 */
export function getPropertyName(column: ColumnMeta): string {
  return column.alias ?? column.name;
}

/**
 * Infer TypeScript type for a single column
 */
export function inferColumnType(column: ColumnMeta): ColumnTypeInfo {
  const mysqlType = column.type.toUpperCase();
  const tsType = TYPE_MAPPING[mysqlType] ?? "unknown";

  // Handle ENUM type
  if (tsType === "enum" && column.enumValues) {
    return {
      type: "enum",
      nullable: column.nullable,
      enumValues: column.enumValues,
    };
  }

  return {
    type: tsType,
    nullable: column.nullable,
  };
}

runAsWorker(getQueryTypes);
