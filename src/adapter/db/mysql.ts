import mysql from "mysql2/promise";
import parser from "node-sql-parser";

import type { ColumnMeta, QueryMeta } from "../../types/meta.i";

import type { DatabaseConfig } from "./config.i";
import type { IDatabaseAdapter } from "./db.i";

const { Parser } = parser;

/** Type definitions for node-sql-parser AST */
interface SqlColumn {
  as?: string;
  expr: SqlExpr;
}

interface SqlExpr {
  type?: string;
  name?: string;
  args?: SqlExprList;
}

interface SqlExprList {
  type?: string;
  value?: SqlExpr[];
}

interface SqlSelectAst {
  type: string;
  columns: SqlColumn[] | "*";
}

/** MySQL type codes */
const TYPE_CODE = {
  TINYINT: 1,
  SMALLINT: 2,
  INT: 3,
  FLOAT: 4,
  DOUBLE: 5,
  TIMESTAMP: 7,
  BIGINT: 8,
  MEDIUMINT: 9,
  DATE: 10,
  TIME: 11,
  DATETIME: 12,
  YEAR: 13,
  JSON: 245,
  DECIMAL: 246,
  ENUM: 247,
  BLOB: 252,
  VARCHAR: 253,
  CHAR: 254,
} as const;

/** Map of type codes to type names */
const TYPE_MAP: Record<number, string> = {
  [TYPE_CODE.TINYINT]: "TINYINT",
  [TYPE_CODE.SMALLINT]: "SMALLINT",
  [TYPE_CODE.INT]: "INT",
  [TYPE_CODE.FLOAT]: "FLOAT",
  [TYPE_CODE.DOUBLE]: "DOUBLE",
  [TYPE_CODE.TIMESTAMP]: "TIMESTAMP",
  [TYPE_CODE.BIGINT]: "BIGINT",
  [TYPE_CODE.MEDIUMINT]: "MEDIUMINT",
  [TYPE_CODE.DATE]: "DATE",
  [TYPE_CODE.TIME]: "TIME",
  [TYPE_CODE.DATETIME]: "DATETIME",
  [TYPE_CODE.YEAR]: "YEAR",
  [TYPE_CODE.JSON]: "JSON",
  [TYPE_CODE.DECIMAL]: "DECIMAL",
  [TYPE_CODE.ENUM]: "ENUM",
  [TYPE_CODE.BLOB]: "BLOB",
  [TYPE_CODE.VARCHAR]: "VARCHAR",
  [TYPE_CODE.CHAR]: "CHAR",
};

/** NOT_NULL flag in MySQL field flags */
const NOT_NULL_FLAG = 0x01;

/** Binary charset number (used to distinguish BLOB from TEXT) */
const BINARY_CHARSET = 63;

/** Aggregate function names */
const AGGREGATE_FUNCTIONS = new Set([
  "COUNT",
  "SUM",
  "AVG",
  "MAX",
  "MIN",
  "GROUP_CONCAT",
  "BIT_AND",
  "BIT_OR",
  "BIT_XOR",
  "STD",
  "STDDEV",
  "STDDEV_POP",
  "STDDEV_SAMP",
  "VAR_POP",
  "VAR_SAMP",
  "VARIANCE",
]);

/** Parsed column info from SQL */
interface ParsedColumnInfo {
  alias: string | null;
  isAggregate: boolean;
  hasCoalesce: boolean;
}

/**
 * MySQL database adapter using prepared statements to fetch query metadata
 */
export class MySQLAdapter implements IDatabaseAdapter {
  private pool: mysql.Pool | null = null;
  private config: DatabaseConfig;
  private parser: InstanceType<typeof Parser>;

  /**
   * Create a new MySQL adapter instance
   */
  constructor(config: DatabaseConfig) {
    this.config = config;
    this.parser = new Parser();
  }

  /**
   * Establish connection pool to MySQL database
   */
  async connect(): Promise<void> {
    this.pool = mysql.createPool({
      host: this.config.host,
      port: this.config.port ?? 3306,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });

    // Test connection
    const connection = await this.pool.getConnection();
    connection.release();
  }

  /**
   * Close all connections in the pool
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * Get column metadata for a SQL query using prepared statement
   */
  async getQueryMetadata(sql: string): Promise<QueryMeta> {
    if (!this.pool) {
      throw new Error("Not connected to database");
    }

    const connection = await this.pool.getConnection();
    try {
      // Parse SQL to extract aggregate info
      const parsedColumns = this.parseColumnsFromSql(sql);

      // Use PREPARE to get metadata without executing
      const prepared = await connection.prepare(sql);
      const fields = (prepared as unknown as { statement: { columns: mysql.FieldPacket[] } })
        .statement.columns;

      const columns: ColumnMeta[] = await Promise.all(
        fields.map((field, index) => this.mapColumn(field, connection, parsedColumns[index])),
      );

      await prepared.close();

      return { columns };
    } finally {
      connection.release();
    }
  }

  /**
   * Parse SQL to extract column information (aggregates, coalesce, etc.)
   */
  private parseColumnsFromSql(sql: string): ParsedColumnInfo[] {
    try {
      const ast = this.parser.astify(sql, { database: "MySQL" }) as SqlSelectAst | SqlSelectAst[];
      const selectAst: SqlSelectAst | undefined = Array.isArray(ast) ? ast[0] : ast;

      if (selectAst?.type !== "select" || !selectAst.columns) {
        return [];
      }

      const columns = selectAst.columns;
      if (columns === "*") {
        return [];
      }

      return columns.map((col: SqlColumn) => ({
        alias: col.as ?? null,
        isAggregate: this.isAggregateExpr(col.expr),
        hasCoalesce: this.hasCoalesceExpr(col.expr),
      }));
    } catch {
      // If parsing fails, return empty array
      return [];
    }
  }

  /**
   * Check if expression is an aggregate function
   */
  private isAggregateExpr(expr: unknown): boolean {
    if (!expr || typeof expr !== "object") return false;

    const e = expr as { type?: string; name?: string; args?: unknown };

    if (e.type === "aggr_func" && e.name) {
      return AGGREGATE_FUNCTIONS.has(e.name.toUpperCase());
    }

    // Check nested expressions
    if (e.args) {
      if (Array.isArray(e.args)) {
        return e.args.some((arg) => this.isAggregateExpr(arg));
      }
      return this.isAggregateExpr(e.args);
    }

    return false;
  }

  /**
   * Check if expression contains COALESCE or IFNULL
   */
  private hasCoalesceExpr(expr: unknown): boolean {
    if (!expr || typeof expr !== "object") return false;

    const e = expr as { type?: string; name?: string; args?: unknown };

    if (e.type === "function") {
      const funcName = (e.name ?? "").toUpperCase();
      if (funcName === "COALESCE" || funcName === "IFNULL") {
        return true;
      }
    }

    // Check nested expressions
    if (e.args) {
      if (Array.isArray(e.args)) {
        return e.args.some((arg) => this.hasCoalesceExpr(arg));
      }
      return this.hasCoalesceExpr(e.args);
    }

    return false;
  }

  /**
   * Map MySQL field to ColumnMetadata
   */
  private async mapColumn(
    field: mysql.FieldPacket,
    connection: mysql.PoolConnection,
    parsedInfo?: ParsedColumnInfo,
  ): Promise<ColumnMeta> {
    const typeCode = field.columnType ?? 0;
    const typeName = this.getTypeName(typeCode);

    // Determine if nullable
    const flags = Number(field.flags ?? 0);
    let nullable = (flags & NOT_NULL_FLAG) === 0;

    // COALESCE/IFNULL makes result non-nullable
    if (parsedInfo?.hasCoalesce) {
      nullable = false;
    }

    // Distinguish TEXT from BLOB using charset
    // BLOB uses binary charset (63), TEXT uses non-binary charset
    let finalTypeName = typeName;
    if (typeCode === TYPE_CODE.BLOB) {
      const charset = (field as unknown as { characterSet?: number }).characterSet ?? 0;
      if (charset !== BINARY_CHARSET) {
        finalTypeName = "TEXT";
      }
    }

    const metadata: ColumnMeta = {
      name: field.orgName || field.name,
      table: field.table || null,
      type: finalTypeName,
      typeCode,
      nullable,
    };

    // Handle alias
    if (field.name !== field.orgName && field.orgName) {
      metadata.alias = field.name;
    } else if (parsedInfo?.alias) {
      metadata.alias = parsedInfo.alias;
    }

    // Handle aggregate functions
    if (parsedInfo?.isAggregate) {
      metadata.isAggregate = true;
    }

    // mysql2 の prepare statement は ENUM を CHAR (254) として返すため、
    // INFORMATION_SCHEMA を確認して実際の型を取得する
    if (typeCode === TYPE_CODE.CHAR && field.table && field.orgName) {
      const enumValues = await this.getEnumValues(field.table, field.orgName, connection);
      if (enumValues.length > 0) {
        metadata.type = "ENUM";
        metadata.typeCode = TYPE_CODE.ENUM;
        metadata.enumValues = enumValues;
      }
    }

    // Fetch ENUM values (typeCode が直接 ENUM の場合)
    if (typeCode === TYPE_CODE.ENUM && field.table && field.orgName && !metadata.enumValues) {
      metadata.enumValues = await this.getEnumValues(field.table, field.orgName, connection);
    }

    return metadata;
  }

  /**
   * Get ENUM values from INFORMATION_SCHEMA
   */
  private async getEnumValues(
    table: string,
    column: string,
    connection: mysql.PoolConnection,
  ): Promise<string[]> {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [this.config.database, table, column],
    );

    const row = rows[0];
    if (!row) return [];

    const columnType = row["COLUMN_TYPE"] as string;
    const match = /enum\((.+)\)/i.exec(columnType);
    if (!match?.[1]) return [];

    // Parse enum values: "enum('a','b','c')" -> ['a', 'b', 'c']
    return match[1].split(",").map((v) => v.trim().replace(/^'|'$/g, ""));
  }

  /**
   * Convert MySQL type code to type name
   */
  private getTypeName(typeCode: number): string {
    return TYPE_MAP[typeCode] ?? "UNKNOWN";
  }

  /**
   * Check if SQL is a SELECT query
   */
  static isSelectQuery(sql: string): boolean {
    return /^\s*SELECT\b/i.test(sql);
  }
}
