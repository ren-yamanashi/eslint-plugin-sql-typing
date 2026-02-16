import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

import type { QueryMeta } from "../types/meta.i";

/** Cache configuration options */
export interface CacheOptions {
  /** Directory to store cache files */
  cacheDir?: string;
  /** Schema version for cache invalidation */
  schemaVersion: string;
  /** Use in-memory only mode (no file persistence) */
  inMemoryOnly?: boolean;
}

/** Cache entry structure */
interface CacheEntry {
  metadata: QueryMeta;
  schemaVersion: string;
}

/**
 * Query metadata cache with file persistence
 */
export class QueryCache {
  private readonly cacheDir: string | null;
  private readonly schemaVersion: string;
  private readonly inMemoryOnly: boolean;
  private readonly memoryCache = new Map<string, CacheEntry>();

  /**
   * Create a new QueryCache instance
   */
  constructor(options: CacheOptions) {
    this.schemaVersion = options.schemaVersion;
    this.inMemoryOnly = options.inMemoryOnly ?? false;
    this.cacheDir = options.cacheDir ?? null;

    // Load existing cache from disk
    if (!this.inMemoryOnly && this.cacheDir) {
      this.loadFromDisk();
    }
  }

  /**
   * Get cached metadata for a SQL query
   */
  get(sql: string): QueryMeta | null {
    const key = this.generateKey(sql);
    const entry = this.memoryCache.get(key);

    if (!entry) {
      return null;
    }

    // Check schema version
    if (entry.schemaVersion !== this.schemaVersion) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.metadata;
  }

  /**
   * Store metadata in cache
   */
  set(sql: string, metadata: QueryMeta): void {
    const key = this.generateKey(sql);
    const entry: CacheEntry = {
      metadata,
      schemaVersion: this.schemaVersion,
    };

    this.memoryCache.set(key, entry);

    if (!this.inMemoryOnly) {
      this.persistToDisk();
    }
  }

  /**
   * Delete a specific cache entry
   */
  delete(sql: string): void {
    const key = this.generateKey(sql);
    this.memoryCache.delete(key);

    if (!this.inMemoryOnly) {
      this.persistToDisk();
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.memoryCache.clear();

    if (!this.inMemoryOnly) {
      this.persistToDisk();
    }
  }

  /**
   * Generate cache key from SQL query
   */
  generateKey(sql: string): string {
    const normalized = this.normalizeSql(sql);
    const hash = createHash("sha256")
      .update(normalized + this.schemaVersion)
      .digest("hex")
      .slice(0, 16);
    return hash;
  }

  /**
   * Normalize SQL for consistent cache keys
   */
  private normalizeSql(sql: string): string {
    return sql.toLowerCase().replace(/\s+/g, " ").trim();
  }

  /**
   * Load cache from disk
   */
  private loadFromDisk(): void {
    if (!this.cacheDir) return;

    const cacheFile = this.getCacheFilePath();
    if (!existsSync(cacheFile)) return;

    try {
      const data = readFileSync(cacheFile, "utf-8");
      const entries = JSON.parse(data) as Record<string, CacheEntry>;

      for (const [key, entry] of Object.entries(entries)) {
        this.memoryCache.set(key, entry);
      }
    } catch {
      // Ignore corrupted cache file
    }
  }

  /**
   * Persist cache to disk
   */
  private persistToDisk(): void {
    if (!this.cacheDir) return;

    // Ensure cache directory exists
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }

    const cacheFile = this.getCacheFilePath();
    const data: Record<string, CacheEntry> = {};

    for (const [key, entry] of this.memoryCache.entries()) {
      data[key] = entry;
    }

    writeFileSync(cacheFile, JSON.stringify(data, null, 2));
  }

  /**
   * Get cache file path
   */
  private getCacheFilePath(): string {
    return join(this.cacheDir ?? "", "query-cache.json");
  }
}
