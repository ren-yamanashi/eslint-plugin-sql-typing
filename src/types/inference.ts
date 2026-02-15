/**
 * Inferred type information
 */
export interface TypeInfo {
  /** TypeScript type (number, string, Date, etc.) */
  type: string;
  /** Whether NULL is allowed */
  nullable: boolean;
  /** List of values for ENUM type */
  enumValues?: string[];
  /** Table name (for nestTables option) */
  table?: string;
}

/**
 * Map of column names to type information
 */
export type InferredTypes = Record<string, TypeInfo>;
