import type { TSESTree } from "@typescript-eslint/utils";

import type { QueryMetadata } from "../types/index.js";
import type { TypeInfo } from "../types/inference.js";

/**
 * Database adapter interface for fetching query metadata
 */
export interface IDatabaseAdapter {
  /**
   * Establish connection to the database
   */
  connect(): Promise<void>;

  /**
   * Close the database connection
   */
  disconnect(): Promise<void>;

  /**
   * Get column metadata for a SQL query using prepared statement
   */
  getQueryMetadata(sql: string): Promise<QueryMetadata>;
}

/**
 * Query options extracted from call expression
 */
export interface QueryOptions {
  nestTables: boolean;
  rowsAsArray: boolean;
}

/**
 * Fix information for ESLint autofix
 */
export interface FixInfo {
  range: [number, number];
  text: string;
}

/**
 * Parsed type annotation
 */
export interface ParsedTypeAnnotation {
  columns: Record<string, TypeInfo>;
}

/**
 * Library adapter interface for ESLint rule integration
 */
export interface ILibraryAdapter {
  /**
   * Check if a call expression is a target method
   */
  isTargetMethod(callExpr: TSESTree.CallExpression): boolean;

  /**
   * Extract SQL string from call expression
   */
  extractSql(callExpr: TSESTree.CallExpression): string | null;

  /**
   * Get existing type annotation from call expression
   */
  getExistingTypeAnnotation(callExpr: TSESTree.CallExpression): ParsedTypeAnnotation | null;

  /**
   * Generate fix for type annotation
   */
  generateFix(callExpr: TSESTree.CallExpression, expectedType: string): FixInfo;

  /**
   * Get query options from call expression
   */
  getQueryOptions(callExpr: TSESTree.CallExpression): QueryOptions;

  /**
   * Check if RowDataPacket import exists
   */
  hasRowDataPacketImport(sourceCode: unknown): boolean;

  /**
   * Get required import statement
   */
  getRequiredImport(): string;
}
