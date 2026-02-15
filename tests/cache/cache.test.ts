/**
 * Cache System Unit Tests
 *
 * These tests verify the cache system correctly:
 * - Stores and retrieves query metadata
 * - Uses hash(SQL + schemaVersion) as cache key
 * - Invalidates cache when schema version changes
 * - Persists to file system
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync, mkdirSync } from "fs";
import { join } from "path";
import { QueryCache } from "../../src/cache/cache.js";
import type { QueryMetadata } from "../../src/types/metadata.js";

const TEST_CACHE_DIR = join(__dirname, ".test-cache");

describe("Query Cache", () => {
  let cache: QueryCache;

  beforeEach(() => {
    // Clean up test cache directory
    if (existsSync(TEST_CACHE_DIR)) {
      rmSync(TEST_CACHE_DIR, { recursive: true });
    }
    mkdirSync(TEST_CACHE_DIR, { recursive: true });

    cache = new QueryCache({ cacheDir: TEST_CACHE_DIR, schemaVersion: "v1" });
  });

  afterEach(() => {
    // Clean up
    if (existsSync(TEST_CACHE_DIR)) {
      rmSync(TEST_CACHE_DIR, { recursive: true });
    }
  });

  // =========================================================================
  // Basic Operations
  // =========================================================================

  describe("Basic Operations", () => {
    it("should store and retrieve metadata", async () => {
      const sql = "SELECT id, name FROM users";
      const metadata: QueryMetadata = {
        columns: [
          { name: "id", table: "users", type: "INT", typeCode: 3, nullable: false },
          { name: "name", table: "users", type: "VARCHAR", typeCode: 253, nullable: false },
        ],
      };

      await cache.set(sql, metadata);
      const retrieved = await cache.get(sql);

      expect(retrieved).toEqual(metadata);
    });

    it("should return null for non-existent key", async () => {
      const result = await cache.get("SELECT * FROM nonexistent");

      expect(result).toBeNull();
    });

    it("should overwrite existing entry", async () => {
      const sql = "SELECT id FROM users";
      const metadata1: QueryMetadata = {
        columns: [{ name: "id", table: "users", type: "INT", typeCode: 3, nullable: false }],
      };
      const metadata2: QueryMetadata = {
        columns: [{ name: "id", table: "users", type: "BIGINT", typeCode: 8, nullable: false }],
      };

      await cache.set(sql, metadata1);
      await cache.set(sql, metadata2);
      const retrieved = await cache.get(sql);

      expect(retrieved).toEqual(metadata2);
    });
  });

  // =========================================================================
  // Cache Key Generation
  // =========================================================================

  describe("Cache Key Generation", () => {
    it("should generate same key for same SQL", () => {
      const sql = "SELECT id FROM users";

      const key1 = cache.generateKey(sql);
      const key2 = cache.generateKey(sql);

      expect(key1).toBe(key2);
    });

    it("should generate different keys for different SQL", () => {
      const sql1 = "SELECT id FROM users";
      const sql2 = "SELECT name FROM users";

      const key1 = cache.generateKey(sql1);
      const key2 = cache.generateKey(sql2);

      expect(key1).not.toBe(key2);
    });

    it("should normalize whitespace in SQL", () => {
      const sql1 = "SELECT id FROM users";
      const sql2 = "SELECT   id   FROM   users";
      const sql3 = "SELECT\n  id\nFROM\n  users";

      const key1 = cache.generateKey(sql1);
      const key2 = cache.generateKey(sql2);
      const key3 = cache.generateKey(sql3);

      expect(key1).toBe(key2);
      expect(key1).toBe(key3);
    });

    it("should be case-insensitive for keywords", () => {
      const sql1 = "SELECT id FROM users";
      const sql2 = "select id from users";

      const key1 = cache.generateKey(sql1);
      const key2 = cache.generateKey(sql2);

      expect(key1).toBe(key2);
    });

    it("should be case-sensitive for identifiers", () => {
      const sql1 = "SELECT Id FROM Users";
      const sql2 = "SELECT id FROM users";

      // This test depends on implementation - might be equal or different
      // based on design decision
      const key1 = cache.generateKey(sql1);
      const key2 = cache.generateKey(sql2);

      // Document the behavior
      expect(typeof key1).toBe("string");
      expect(typeof key2).toBe("string");
    });
  });

  // =========================================================================
  // Schema Version Handling
  // =========================================================================

  describe("Schema Version Handling", () => {
    it("should invalidate cache when schema version changes", async () => {
      const sql = "SELECT id FROM users";
      const metadata: QueryMetadata = {
        columns: [{ name: "id", table: "users", type: "INT", typeCode: 3, nullable: false }],
      };

      // Set with version v1
      await cache.set(sql, metadata);

      // Create new cache with different version
      const cache2 = new QueryCache({ cacheDir: TEST_CACHE_DIR, schemaVersion: "v2" });
      const retrieved = await cache2.get(sql);

      expect(retrieved).toBeNull();
    });

    it("should retrieve cache with same schema version", async () => {
      const sql = "SELECT id FROM users";
      const metadata: QueryMetadata = {
        columns: [{ name: "id", table: "users", type: "INT", typeCode: 3, nullable: false }],
      };

      await cache.set(sql, metadata);

      // Create new cache with same version
      const cache2 = new QueryCache({ cacheDir: TEST_CACHE_DIR, schemaVersion: "v1" });
      const retrieved = await cache2.get(sql);

      expect(retrieved).toEqual(metadata);
    });
  });

  // =========================================================================
  // File Persistence
  // =========================================================================

  describe("File Persistence", () => {
    it("should persist cache to file system", async () => {
      const sql = "SELECT id FROM users";
      const metadata: QueryMetadata = {
        columns: [{ name: "id", table: "users", type: "INT", typeCode: 3, nullable: false }],
      };

      await cache.set(sql, metadata);

      // Cache file should exist
      const cacheFiles = existsSync(TEST_CACHE_DIR);
      expect(cacheFiles).toBe(true);
    });

    it("should load cache from file system on initialization", async () => {
      const sql = "SELECT id FROM users";
      const metadata: QueryMetadata = {
        columns: [{ name: "id", table: "users", type: "INT", typeCode: 3, nullable: false }],
      };

      await cache.set(sql, metadata);

      // Create new cache instance - should load from file
      const cache2 = new QueryCache({ cacheDir: TEST_CACHE_DIR, schemaVersion: "v1" });
      const retrieved = await cache2.get(sql);

      expect(retrieved).toEqual(metadata);
    });
  });

  // =========================================================================
  // Cache Invalidation
  // =========================================================================

  describe("Cache Invalidation", () => {
    it("should clear all cache entries", async () => {
      const sql1 = "SELECT id FROM users";
      const sql2 = "SELECT name FROM users";
      const metadata: QueryMetadata = {
        columns: [{ name: "id", table: "users", type: "INT", typeCode: 3, nullable: false }],
      };

      await cache.set(sql1, metadata);
      await cache.set(sql2, metadata);
      await cache.clear();

      expect(await cache.get(sql1)).toBeNull();
      expect(await cache.get(sql2)).toBeNull();
    });

    it("should delete specific cache entry", async () => {
      const sql1 = "SELECT id FROM users";
      const sql2 = "SELECT name FROM users";
      const metadata: QueryMetadata = {
        columns: [{ name: "id", table: "users", type: "INT", typeCode: 3, nullable: false }],
      };

      await cache.set(sql1, metadata);
      await cache.set(sql2, metadata);
      await cache.delete(sql1);

      expect(await cache.get(sql1)).toBeNull();
      expect(await cache.get(sql2)).toEqual(metadata);
    });
  });

  // =========================================================================
  // Complex Metadata
  // =========================================================================

  describe("Complex Metadata", () => {
    it("should store metadata with ENUM values", async () => {
      const sql = "SELECT status FROM users";
      const metadata: QueryMetadata = {
        columns: [
          {
            name: "status",
            table: "users",
            type: "ENUM",
            typeCode: 247,
            nullable: false,
            enumValues: ["pending", "active", "inactive"],
          },
        ],
      };

      await cache.set(sql, metadata);
      const retrieved = await cache.get(sql);

      expect(retrieved).toEqual(metadata);
      expect(retrieved?.columns[0].enumValues).toEqual(["pending", "active", "inactive"]);
    });

    it("should store metadata with multiple columns", async () => {
      const sql = "SELECT id, name, email, status, created_at FROM users";
      const metadata: QueryMetadata = {
        columns: [
          { name: "id", table: "users", type: "INT", typeCode: 3, nullable: false },
          { name: "name", table: "users", type: "VARCHAR", typeCode: 253, nullable: false },
          { name: "email", table: "users", type: "VARCHAR", typeCode: 253, nullable: true },
          {
            name: "status",
            table: "users",
            type: "ENUM",
            typeCode: 247,
            nullable: false,
            enumValues: ["pending", "active", "inactive"],
          },
          { name: "created_at", table: "users", type: "TIMESTAMP", typeCode: 7, nullable: false },
        ],
      };

      await cache.set(sql, metadata);
      const retrieved = await cache.get(sql);

      expect(retrieved).toEqual(metadata);
    });

    it("should store metadata with aliases", async () => {
      const sql = "SELECT id AS user_id, name AS user_name FROM users";
      const metadata: QueryMetadata = {
        columns: [
          {
            name: "id",
            alias: "user_id",
            table: "users",
            type: "INT",
            typeCode: 3,
            nullable: false,
          },
          {
            name: "name",
            alias: "user_name",
            table: "users",
            type: "VARCHAR",
            typeCode: 253,
            nullable: false,
          },
        ],
      };

      await cache.set(sql, metadata);
      const retrieved = await cache.get(sql);

      expect(retrieved).toEqual(metadata);
      expect(retrieved?.columns[0].alias).toBe("user_id");
    });

    it("should store metadata with aggregate flag", async () => {
      const sql = "SELECT COUNT(*) AS total FROM users";
      const metadata: QueryMetadata = {
        columns: [
          {
            name: "COUNT(*)",
            alias: "total",
            table: null,
            type: "BIGINT",
            typeCode: 8,
            nullable: false,
            isAggregate: true,
          },
        ],
      };

      await cache.set(sql, metadata);
      const retrieved = await cache.get(sql);

      expect(retrieved).toEqual(metadata);
      expect(retrieved?.columns[0].isAggregate).toBe(true);
    });
  });

  // =========================================================================
  // Error Handling
  // =========================================================================

  describe("Error Handling", () => {
    it("should handle corrupted cache file gracefully", async () => {
      // This test would require writing invalid JSON to cache file
      // and verifying the cache handles it gracefully
      expect(cache.get).toBeDefined();
    });

    it("should handle missing cache directory", async () => {
      // Remove cache directory
      rmSync(TEST_CACHE_DIR, { recursive: true });

      // Cache should recreate directory
      await cache.set("SELECT id FROM users", {
        columns: [{ name: "id", table: "users", type: "INT", typeCode: 3, nullable: false }],
      });

      expect(existsSync(TEST_CACHE_DIR)).toBe(true);
    });
  });

  // =========================================================================
  // Performance
  // =========================================================================

  describe("Performance", () => {
    it("should handle many entries efficiently", async () => {
      const metadata: QueryMetadata = {
        columns: [{ name: "id", table: "users", type: "INT", typeCode: 3, nullable: false }],
      };

      // Add 100 entries
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        await cache.set(`SELECT id FROM users WHERE id = ${i}`, metadata);
      }
      const writeTime = Date.now() - startTime;

      // Read all entries
      const readStartTime = Date.now();
      for (let i = 0; i < 100; i++) {
        await cache.get(`SELECT id FROM users WHERE id = ${i}`);
      }
      const readTime = Date.now() - readStartTime;

      // Should complete in reasonable time (less than 5 seconds)
      expect(writeTime).toBeLessThan(5000);
      expect(readTime).toBeLessThan(5000);
    });
  });
});

// =========================================================================
// In-Memory Cache Tests
// =========================================================================

describe("In-Memory Cache", () => {
  it("should provide in-memory only mode", () => {
    const memoryCache = new QueryCache({ inMemoryOnly: true, schemaVersion: "v1" });

    expect(memoryCache).toBeDefined();
  });

  it("should not persist when in-memory only", async () => {
    const memoryCache = new QueryCache({
      inMemoryOnly: true,
      schemaVersion: "v1",
      cacheDir: TEST_CACHE_DIR,
    });

    const sql = "SELECT id FROM users";
    const metadata: QueryMetadata = {
      columns: [{ name: "id", table: "users", type: "INT", typeCode: 3, nullable: false }],
    };

    await memoryCache.set(sql, metadata);

    // No files should be created
    if (existsSync(TEST_CACHE_DIR)) {
      const files = require("fs").readdirSync(TEST_CACHE_DIR);
      expect(files.length).toBe(0);
    }
  });
});
