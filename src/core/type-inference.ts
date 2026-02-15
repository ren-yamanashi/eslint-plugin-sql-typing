import type { InferredTypes, TypeInfo } from "../types/inference.js";
import type { QueryMetadata, ColumnMetadata } from "../types/metadata.js";

/** MySQL type to TypeScript type mapping */
const TYPE_MAPPING: Record<string, string> = {
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

/**
 * Infer TypeScript types from MySQL query metadata
 */
export function inferTypes(metadata: QueryMetadata): InferredTypes {
  const result: InferredTypes = {};

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
function getPropertyName(column: ColumnMetadata): string {
  return column.alias ?? column.name;
}

/**
 * Infer TypeScript type for a single column
 */
function inferColumnType(column: ColumnMetadata): TypeInfo {
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
