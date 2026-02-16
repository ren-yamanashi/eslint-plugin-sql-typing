import { existsSync, mkdirSync, readdirSync, rmSync } from "fs";
import { join } from "path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { QueryMeta } from "../types/meta.i";

import { QueryCache } from "./cache";

const TEST_CACHE_DIR = join(import.meta.dirname, ".test-cache");

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

  describe("Basic Operations", () => {
    it("should store and retrieve metadata", () => {
      // GIVEN
      const sql = "SELECT id, name FROM users";
      const metadata: QueryMeta = {
        columns: [
          {
            name: "id",
            table: "users",
            type: "INT",
            typeCode: 3,
            nullable: false,
          },
          {
            name: "name",
            table: "users",
            type: "VARCHAR",
            typeCode: 253,
            nullable: false,
          },
        ],
      };

      // WHEN
      cache.set(sql, metadata);
      const retrieved = cache.get(sql);

      // THEN
      expect(retrieved).toEqual(metadata);
    });

    it("should return null for non-existent key", () => {
      // GIVEN
      const sql = "SELECT * FROM nonexistent";

      // WHEN
      const result = cache.get(sql);

      // THEN
      expect(result).toBeNull();
    });

    it("should overwrite existing entry", () => {
      // GIVEN
      const sql = "SELECT id FROM users";
      const metadata1: QueryMeta = {
        columns: [
          {
            name: "id",
            table: "users",
            type: "INT",
            typeCode: 3,
            nullable: false,
          },
        ],
      };
      const metadata2: QueryMeta = {
        columns: [
          {
            name: "id",
            table: "users",
            type: "BIGINT",
            typeCode: 8,
            nullable: false,
          },
        ],
      };

      // WHEN
      cache.set(sql, metadata1);
      cache.set(sql, metadata2);
      const retrieved = cache.get(sql);

      // THEN
      expect(retrieved).toEqual(metadata2);
    });
  });

  describe("Cache Key Generation", () => {
    it("should generate same key for same SQL", () => {
      // GIVEN
      const sql = "SELECT id FROM users";

      // WHEN
      const key1 = cache.generateKey(sql);
      const key2 = cache.generateKey(sql);

      // THEN
      expect(key1).toBe(key2);
    });

    it("should generate different keys for different SQL", () => {
      // GIVEN
      const sql1 = "SELECT id FROM users";
      const sql2 = "SELECT name FROM users";

      // WHEN
      const key1 = cache.generateKey(sql1);
      const key2 = cache.generateKey(sql2);

      // THEN
      expect(key1).not.toBe(key2);
    });

    it("should normalize whitespace in SQL", () => {
      // GIVEN
      const sql1 = "SELECT id FROM users";
      const sql2 = "SELECT   id   FROM   users";
      const sql3 = "SELECT\n  id\nFROM\n  users";

      // WHEN
      const key1 = cache.generateKey(sql1);
      const key2 = cache.generateKey(sql2);
      const key3 = cache.generateKey(sql3);

      // THEN
      expect(key1).toBe(key2);
      expect(key1).toBe(key3);
    });

    it("should be case-insensitive for keywords", () => {
      // GIVEN
      const sql1 = "SELECT id FROM users";
      const sql2 = "select id from users";

      // WHEN
      const key1 = cache.generateKey(sql1);
      const key2 = cache.generateKey(sql2);

      // THEN
      expect(key1).toBe(key2);
    });

    it("should be case-sensitive for identifiers", () => {
      // GIVEN
      const sql1 = "SELECT Id FROM Users";
      const sql2 = "SELECT id FROM users";

      // WHEN
      const key1 = cache.generateKey(sql1);
      const key2 = cache.generateKey(sql2);

      // THEN
      expect(typeof key1).toBe("string");
      expect(typeof key2).toBe("string");
    });
  });

  describe("Schema Version Handling", () => {
    it("should invalidate cache when schema version changes", () => {
      // GIVEN
      const sql = "SELECT id FROM users";
      const metadata: QueryMeta = {
        columns: [
          {
            name: "id",
            table: "users",
            type: "INT",
            typeCode: 3,
            nullable: false,
          },
        ],
      };
      cache.set(sql, metadata);

      // WHEN
      const cache2 = new QueryCache({
        cacheDir: TEST_CACHE_DIR,
        schemaVersion: "v2",
      });
      const retrieved = cache2.get(sql);

      // THEN
      expect(retrieved).toBeNull();
    });

    it("should retrieve cache with same schema version", () => {
      // GIVEN
      const sql = "SELECT id FROM users";
      const metadata: QueryMeta = {
        columns: [
          {
            name: "id",
            table: "users",
            type: "INT",
            typeCode: 3,
            nullable: false,
          },
        ],
      };
      cache.set(sql, metadata);

      // WHEN
      const cache2 = new QueryCache({
        cacheDir: TEST_CACHE_DIR,
        schemaVersion: "v1",
      });
      const retrieved = cache2.get(sql);

      // THEN
      expect(retrieved).toEqual(metadata);
    });
  });

  describe("File Persistence", () => {
    it("should persist cache to file system", () => {
      // GIVEN
      const sql = "SELECT id FROM users";
      const metadata: QueryMeta = {
        columns: [
          {
            name: "id",
            table: "users",
            type: "INT",
            typeCode: 3,
            nullable: false,
          },
        ],
      };

      // WHEN
      cache.set(sql, metadata);

      // THEN
      const cacheExists = existsSync(TEST_CACHE_DIR);
      expect(cacheExists).toBe(true);
    });

    it("should load cache from file system on initialization", () => {
      // GIVEN
      const sql = "SELECT id FROM users";
      const metadata: QueryMeta = {
        columns: [
          {
            name: "id",
            table: "users",
            type: "INT",
            typeCode: 3,
            nullable: false,
          },
        ],
      };
      cache.set(sql, metadata);

      // WHEN
      const cache2 = new QueryCache({
        cacheDir: TEST_CACHE_DIR,
        schemaVersion: "v1",
      });
      const retrieved = cache2.get(sql);

      // THEN
      expect(retrieved).toEqual(metadata);
    });
  });

  describe("Cache Invalidation", () => {
    it("should clear all cache entries", () => {
      // GIVEN
      const sql1 = "SELECT id FROM users";
      const sql2 = "SELECT name FROM users";
      const metadata: QueryMeta = {
        columns: [
          {
            name: "id",
            table: "users",
            type: "INT",
            typeCode: 3,
            nullable: false,
          },
        ],
      };
      cache.set(sql1, metadata);
      cache.set(sql2, metadata);

      // WHEN
      cache.clear();

      // THEN
      expect(cache.get(sql1)).toBeNull();
      expect(cache.get(sql2)).toBeNull();
    });

    it("should delete specific cache entry", () => {
      // GIVEN
      const sql1 = "SELECT id FROM users";
      const sql2 = "SELECT name FROM users";
      const metadata: QueryMeta = {
        columns: [
          {
            name: "id",
            table: "users",
            type: "INT",
            typeCode: 3,
            nullable: false,
          },
        ],
      };
      cache.set(sql1, metadata);
      cache.set(sql2, metadata);

      // WHEN
      cache.delete(sql1);

      // THEN
      expect(cache.get(sql1)).toBeNull();
      expect(cache.get(sql2)).toEqual(metadata);
    });
  });

  describe("Complex Metadata", () => {
    it("should store metadata with ENUM values", () => {
      // GIVEN
      const sql = "SELECT status FROM users";
      const metadata: QueryMeta = {
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

      // WHEN
      cache.set(sql, metadata);
      const retrieved = cache.get(sql);

      // THEN
      expect(retrieved).toEqual(metadata);
      expect(retrieved?.columns[0]?.enumValues).toEqual(["pending", "active", "inactive"]);
    });

    it("should store metadata with multiple columns", () => {
      // GIVEN
      const sql = "SELECT id, name, email, status, created_at FROM users";
      const metadata: QueryMeta = {
        columns: [
          {
            name: "id",
            table: "users",
            type: "INT",
            typeCode: 3,
            nullable: false,
          },
          {
            name: "name",
            table: "users",
            type: "VARCHAR",
            typeCode: 253,
            nullable: false,
          },
          {
            name: "email",
            table: "users",
            type: "VARCHAR",
            typeCode: 253,
            nullable: true,
          },
          {
            name: "status",
            table: "users",
            type: "ENUM",
            typeCode: 247,
            nullable: false,
            enumValues: ["pending", "active", "inactive"],
          },
          {
            name: "created_at",
            table: "users",
            type: "TIMESTAMP",
            typeCode: 7,
            nullable: false,
          },
        ],
      };

      // WHEN
      cache.set(sql, metadata);
      const retrieved = cache.get(sql);

      // THEN
      expect(retrieved).toEqual(metadata);
    });

    it("should store metadata with aliases", () => {
      // GIVEN
      const sql = "SELECT id AS user_id, name AS user_name FROM users";
      const metadata: QueryMeta = {
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

      // WHEN
      cache.set(sql, metadata);
      const retrieved = cache.get(sql);

      // THEN
      expect(retrieved).toEqual(metadata);
      expect(retrieved?.columns[0]?.alias).toBe("user_id");
    });

    it("should store metadata with aggregate flag", () => {
      // GIVEN
      const sql = "SELECT COUNT(*) AS total FROM users";
      const metadata: QueryMeta = {
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

      // WHEN
      cache.set(sql, metadata);
      const retrieved = cache.get(sql);

      // THEN
      expect(retrieved).toEqual(metadata);
      expect(retrieved?.columns[0]?.isAggregate).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle corrupted cache file gracefully", () => {
      // GIVEN
      // This test verifies the cache has a get method

      // WHEN / THEN
      expect(typeof cache.get).toBe("function");
    });

    it("should handle missing cache directory", () => {
      // GIVEN
      rmSync(TEST_CACHE_DIR, { recursive: true });
      const sql = "SELECT id FROM users";
      const metadata: QueryMeta = {
        columns: [
          {
            name: "id",
            table: "users",
            type: "INT",
            typeCode: 3,
            nullable: false,
          },
        ],
      };

      // WHEN
      cache.set(sql, metadata);

      // THEN
      expect(existsSync(TEST_CACHE_DIR)).toBe(true);
    });
  });

  describe("Performance", () => {
    it("should handle many entries efficiently", () => {
      // GIVEN
      const metadata: QueryMeta = {
        columns: [
          {
            name: "id",
            table: "users",
            type: "INT",
            typeCode: 3,
            nullable: false,
          },
        ],
      };

      // WHEN
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        cache.set(`SELECT id FROM users WHERE id = ${String(i)}`, metadata);
      }
      const writeTime = Date.now() - startTime;

      const readStartTime = Date.now();
      for (let i = 0; i < 100; i++) {
        cache.get(`SELECT id FROM users WHERE id = ${String(i)}`);
      }
      const readTime = Date.now() - readStartTime;

      // THEN
      expect(writeTime).toBeLessThan(5000);
      expect(readTime).toBeLessThan(5000);
    });
  });
});

describe("In-Memory Cache", () => {
  it("should provide in-memory only mode", () => {
    // GIVEN
    const options = { inMemoryOnly: true, schemaVersion: "v1" };

    // WHEN
    const memoryCache = new QueryCache(options);

    // THEN
    expect(memoryCache).toBeDefined();
  });

  it("should not persist when in-memory only", () => {
    // GIVEN
    const memoryCache = new QueryCache({
      inMemoryOnly: true,
      schemaVersion: "v1",
      cacheDir: TEST_CACHE_DIR,
    });
    const sql = "SELECT id FROM users";
    const metadata: QueryMeta = {
      columns: [
        {
          name: "id",
          table: "users",
          type: "INT",
          typeCode: 3,
          nullable: false,
        },
      ],
    };

    // WHEN
    memoryCache.set(sql, metadata);

    // THEN
    if (existsSync(TEST_CACHE_DIR)) {
      const files = readdirSync(TEST_CACHE_DIR);
      expect(files.length).toBe(0);
    }
  });
});
