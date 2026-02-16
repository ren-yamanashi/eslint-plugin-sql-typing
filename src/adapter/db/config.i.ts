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
