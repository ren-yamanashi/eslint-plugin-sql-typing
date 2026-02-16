import sqlParser from "node-sql-parser";

const { Parser } = sqlParser;

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

/** Parsed column information */
export interface ParsedColumn {
  /** Column name or expression */
  name: string;
  /** Column alias if present */
  alias: string | null;
  /** Table reference if present */
  table: string | null;
  /** Whether this is an aggregate function */
  isAggregate?: boolean;
  /** Aggregate function type (COUNT, SUM, etc.) */
  aggregateType?: string;
  /** Column used in aggregate function */
  aggregateColumn?: string;
}

/** Parsed table information */
export interface ParsedTable {
  /** Table name */
  name: string;
  /** Table alias if present */
  alias: string | null;
}

/** Result of parsing a SQL query */
export interface ParsedSql {
  /** Query type (SELECT, INSERT, etc.) */
  type: string;
  /** Parsed columns */
  columns: ParsedColumn[];
  /** Parsed tables */
  tables: ParsedTable[];
}

/** AST column expression */
interface AstExpr {
  type?: string;
  column?: string;
  table?: string;
  name?: string;
  args?: AstExprList;
}

/** AST expression list */
interface AstExprList {
  type?: string;
  value?: AstExpr[];
  expr?: AstExpr;
}

/** AST column */
interface AstColumn {
  expr: AstExpr;
  as?: string;
}

/** AST FROM clause item */
interface AstFrom {
  table?: string;
  as?: string;
}

/** AST SELECT statement */
interface AstSelect {
  type: string;
  columns: AstColumn[] | "*";
  from?: AstFrom[];
}

const parser = new Parser();

/**
 * Parse SQL query and extract column and table information
 */
export function parseSql(sql: string): ParsedSql {
  const ast = parser.astify(sql, { database: "MySQL" }) as AstSelect | AstSelect[];
  const selectAst: AstSelect | undefined = Array.isArray(ast) ? ast[0] : ast;

  if (!selectAst) {
    return { type: "UNKNOWN", columns: [], tables: [] };
  }

  const type = selectAst.type?.toUpperCase() ?? "UNKNOWN";
  const columns = parseColumns(selectAst.columns);
  const tables = parseTables(selectAst.from);

  return { type, columns, tables };
}

/**
 * Parse columns from AST
 */
function parseColumns(astColumns: AstColumn[] | "*" | undefined): ParsedColumn[] {
  if (!astColumns) {
    return [];
  }

  if (astColumns === "*") {
    return [{ name: "*", alias: null, table: null }];
  }

  return astColumns.map((col) => parseColumn(col));
}

/**
 * Parse a single column from AST
 */
function parseColumn(col: AstColumn): ParsedColumn {
  const expr = col.expr;
  const alias = col.as ?? null;

  // Handle aggregate functions
  if (expr.type === "aggr_func" && expr.name) {
    const aggName = expr.name.toUpperCase();
    if (AGGREGATE_FUNCTIONS.has(aggName)) {
      const aggregateColumn = extractAggregateColumn(expr.args);
      const name = aggregateColumn ? `${aggName}(${aggregateColumn})` : `${aggName}(*)`;

      return {
        name,
        alias,
        table: null,
        isAggregate: true,
        aggregateType: aggName,
        ...(aggregateColumn && { aggregateColumn }),
      };
    }
  }

  // Handle column reference
  if (expr.type === "column_ref") {
    return {
      name: expr.column ?? "",
      alias,
      table: expr.table ?? null,
    };
  }

  // Handle other expressions (literals, functions, etc.)
  return {
    name: col.as ?? "?",
    alias,
    table: null,
  };
}

/**
 * Extract column name from aggregate function arguments
 */
function extractAggregateColumn(args: AstExprList | undefined): string | null {
  if (!args) {
    return null;
  }

  // Handle args.expr format (e.g., SUM(balance))
  if (args.expr?.type === "column_ref" && args.expr.column) {
    return args.expr.column;
  }

  // Handle args.value format (e.g., COUNT(*))
  if (args.value?.length) {
    const firstArg = args.value[0];
    if (firstArg?.type === "column_ref" && firstArg.column) {
      return firstArg.column;
    }

    // Handle star (*) argument
    if (firstArg?.type === "star") {
      return null;
    }
  }

  return null;
}

/**
 * Parse tables from AST FROM clause
 */
function parseTables(from: AstFrom[] | undefined): ParsedTable[] {
  if (!from) {
    return [];
  }

  return from.map((item) => ({
    name: item.table ?? "",
    alias: item.as ?? null,
  }));
}
