/**
 * Column metadata retrieved from MySQL
 */
export interface ColumnMeta {
  /** Column name */
  name: string;
  /** Alias (name specified with AS) */
  alias?: string;
  /** Table name (used for JOINs) */
  table: string | null;
  /** MySQL type name (INT, VARCHAR, etc.) */
  type: string;
  /** MySQL type code */
  typeCode: number;
  /** Whether NULL is allowed */
  nullable: boolean;
  /** List of values for ENUM type */
  enumValues?: string[];
  /** Whether this is an aggregate function (COUNT, SUM, etc.) */
  isAggregate?: boolean;
}

/**
 * Query metadata
 */
export interface QueryMeta {
  columns: ColumnMeta[];
}
