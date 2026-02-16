import type { ColumnTypeInfo, ColumnTypeRegistry } from "../types/column.i";

/** Options for type string generation */
export interface GenerateOptions {
  /** Output format */
  format?: "plain" | "mysql2";
  /** Use nestTables format (group by table) */
  nestTables?: boolean;
  /** Use rowsAsArray format (tuple type) */
  rowsAsArray?: boolean;
}

/**
 * Generate TypeScript type string from inferred types
 */
export function generateTypeString(
  types: ColumnTypeRegistry,
  options: GenerateOptions = {},
): string {
  const { format = "plain", nestTables = false, rowsAsArray = false } = options;

  // Handle rowsAsArray format (tuple)
  if (format === "mysql2" && rowsAsArray) {
    return generateTupleType(types);
  }

  // Handle nestTables format
  if (format === "mysql2" && nestTables) {
    return generateNestedType(types);
  }

  // Generate object type
  const objectType = generateObjectType(types);

  // Wrap with RowDataPacket for mysql2 format
  if (format === "mysql2") {
    return `(RowDataPacket & ${objectType})[]`;
  }

  return objectType;
}

/**
 * Generate object type string
 */
function generateObjectType(types: ColumnTypeRegistry): string {
  const entries = Object.entries(types);

  if (entries.length === 0) {
    return "{}";
  }

  const properties = entries.map(([name, typeInfo]) => {
    const propertyName = formatPropertyName(name);
    const typeString = formatTypeInfo(typeInfo);
    return `${propertyName}: ${typeString}`;
  });

  return `{ ${properties.join("; ")} }`;
}

/**
 * Generate tuple type string for rowsAsArray
 */
function generateTupleType(types: ColumnTypeRegistry): string {
  const entries = Object.entries(types);
  const typeStrings = entries.map(([, typeInfo]) => formatTypeInfo(typeInfo));
  return `[${typeStrings.join(", ")}][]`;
}

/**
 * Generate nested object type for nestTables
 */
function generateNestedType(types: ColumnTypeRegistry): string {
  // Group columns by table
  const tableGroups: Record<string, Record<string, ColumnTypeInfo>> = {};

  for (const [fullName, typeInfo] of Object.entries(types)) {
    const tableName = typeInfo.table ?? extractTableFromName(fullName);
    const columnName = extractColumnFromName(fullName);

    tableGroups[tableName] ??= {};
    tableGroups[tableName][columnName] = typeInfo;
  }

  // Generate nested object type
  const tableTypes = Object.entries(tableGroups).map(([tableName, columns]) => {
    const columnTypes = Object.entries(columns).map(([name, info]) => {
      return `${name}: ${formatTypeInfo(info)}`;
    });
    return `${tableName}: { ${columnTypes.join("; ")} }`;
  });

  return `(RowDataPacket & { ${tableTypes.join("; ")} })[]`;
}

/**
 * Extract table name from "table.column" format
 */
function extractTableFromName(fullName: string): string {
  const parts = fullName.split(".");
  return parts.length > 1 ? (parts[0] ?? "") : "";
}

/**
 * Extract column name from "table.column" format
 */
function extractColumnFromName(fullName: string): string {
  const parts = fullName.split(".");
  return parts.length > 1 ? (parts[1] ?? fullName) : fullName;
}

/**
 * Format property name (quote if needed)
 */
function formatPropertyName(name: string): string {
  // Check if name needs quoting (contains special chars but not underscore)
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    return name;
  }
  return `"${name}"`;
}

/**
 * Format type info to TypeScript type string
 */
function formatTypeInfo(typeInfo: ColumnTypeInfo): string {
  let typeString: string;

  if (typeInfo.type === "enum" && typeInfo.enumValues) {
    // Generate union of string literals
    typeString = typeInfo.enumValues.map((v) => `"${escapeString(v)}"`).join(" | ");
  } else {
    typeString = typeInfo.type;
  }

  // Add null for nullable types
  if (typeInfo.nullable) {
    typeString = `${typeString} | null`;
  }

  return typeString;
}

/**
 * Escape special characters in string literals
 */
function escapeString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
