import type { DatabaseConfig, DatabaseEngine, LibraryType } from "./db/config.i";
import type { IDatabaseAdapter } from "./db/db.i";
import { MySQLAdapter } from "./db/mysql";
import type { ILibraryAdapter } from "./lib/lib.i";
import { MySQL2Adapter } from "./lib/mysql2";

/**
 * Registry for database adapters
 */
const databaseAdapterRegistry: Record<
  DatabaseEngine,
  (config: DatabaseConfig) => IDatabaseAdapter
> = {
  mysql: (config) => new MySQLAdapter(config),
  mariadb: (config) => new MySQLAdapter(config), // MariaDB uses MySQL adapter
  postgresql: () => {
    throw new Error("PostgreSQL adapter is not yet implemented");
  },
};

/**
 * Registry for library adapters
 */
const libraryAdapterRegistry: Record<LibraryType, () => ILibraryAdapter> = {
  mysql2: () => new MySQL2Adapter(),
  prisma: () => {
    throw new Error("Prisma adapter is not yet implemented");
  },
  typeorm: () => {
    throw new Error("TypeORM adapter is not yet implemented");
  },
  "data-api": () => {
    throw new Error("AWS Data API adapter is not yet implemented");
  },
};

/**
 * Get database adapter by engine type
 */
export function getDatabaseAdapter(
  engine: DatabaseEngine,
  config: DatabaseConfig,
): IDatabaseAdapter {
  const factory = databaseAdapterRegistry[engine];
  if (!factory) {
    throw new Error(`Unsupported database engine: ${engine}`);
  }
  return factory(config);
}

/**
 * Get library adapter by library type
 */
export function getLibraryAdapter(library: LibraryType): ILibraryAdapter {
  const factory = libraryAdapterRegistry[library];
  if (!factory) {
    throw new Error(`Unsupported library type: ${library}`);
  }
  return factory();
}

/**
 * Check if database engine is supported
 */
export function isSupportedDatabaseEngine(engine: string): engine is DatabaseEngine {
  return engine in databaseAdapterRegistry;
}

/**
 * Check if library type is supported
 */
export function isSupportedLibraryType(library: string): library is LibraryType {
  return library in libraryAdapterRegistry;
}

/**
 * Get list of supported database engines
 */
export function getSupportedDatabaseEngines(): DatabaseEngine[] {
  return Object.keys(databaseAdapterRegistry) as DatabaseEngine[];
}

/**
 * Get list of supported library types
 */
export function getSupportedLibraryTypes(): LibraryType[] {
  return Object.keys(libraryAdapterRegistry) as LibraryType[];
}
