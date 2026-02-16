import type { TSESTree } from "@typescript-eslint/utils";

import type { ColumnTypeRegistry } from "../../types/column.i";

/**
 * Parsed type annotation
 */
export interface ParsedTypeAnnotation {
  columns: ColumnTypeRegistry;
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
