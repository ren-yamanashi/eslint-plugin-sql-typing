/**
 * Supported database engines
 */
export type DatabaseEngine = "mysql" | "mariadb" | "postgresql";

/**
 * Supported library types
 */
export type LibraryType = "mysql2" | "prisma" | "typeorm" | "data-api";

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  /** DB host */
  host: string;
  /**
   * DB port
   * @default 3306
   */
  port?: number;
  /** DB user */
  user: string;
  /** DB password */
  password: string;
  /** DB name */
  database: string;
}

/**
 * Plugin options for check-sql rule
 */
export interface PluginOptions {
  /**
   * Database engine type
   * @default "mysql"
   */
  dbEngine?: DatabaseEngine;
  /**
   * Library type for SQL execution
   * @default "mysql2"
   */
  library?: LibraryType;
  /** Database connection configuration */
  database?: DatabaseConfig;
}
