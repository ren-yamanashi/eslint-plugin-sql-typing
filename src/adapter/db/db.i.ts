import type { QueryMeta } from "../../types/meta.i";

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
  getQueryMetadata(sql: string): Promise<QueryMeta>;
}
