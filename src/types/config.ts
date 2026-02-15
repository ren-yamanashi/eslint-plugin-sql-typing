/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  host: string;
  port?: number; // default: 3306
  user: string;
  password: string;
  database: string;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  database: DatabaseConfig;
  /** Schema version for cache invalidation */
  schemaVersion?: string;
  /** Enable in CI environment (default: false) */
  enableInCI?: boolean;
  /** Cache directory (default: node_modules/.cache/eslint-plugin-sql-typing) */
  cacheDir?: string;
}
