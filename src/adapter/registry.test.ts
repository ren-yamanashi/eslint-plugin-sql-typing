import { describe, expect, it } from "vitest";

import {
  getDatabaseAdapter,
  getLibraryAdapter,
  getSupportedDatabaseEngines,
  getSupportedLibraryTypes,
  isSupportedDatabaseEngine,
  isSupportedLibraryType,
} from "./registry";

describe("Adapter Registry", () => {
  describe("Database Adapter", () => {
    it("should return MySQL adapter for mysql engine", () => {
      // GIVEN
      const config = {
        host: "localhost",
        user: "test",
        password: "test",
        database: "test",
      };

      // WHEN
      const adapter = getDatabaseAdapter("mysql", config);

      // THEN
      expect(adapter).toBeDefined();
      expect(typeof adapter.connect).toBe("function");
      expect(typeof adapter.disconnect).toBe("function");
      expect(typeof adapter.getQueryMetadata).toBe("function");
    });

    it("should return MySQL adapter for mariadb engine (compatible)", () => {
      // GIVEN
      const config = {
        host: "localhost",
        user: "test",
        password: "test",
        database: "test",
      };

      // WHEN
      const adapter = getDatabaseAdapter("mariadb", config);

      // THEN
      expect(adapter).toBeDefined();
    });

    it("should throw error for unsupported postgresql engine", () => {
      // GIVEN
      const config = {
        host: "localhost",
        user: "test",
        password: "test",
        database: "test",
      };

      // WHEN / THEN
      expect(() => getDatabaseAdapter("postgresql", config)).toThrow(
        "PostgreSQL adapter is not yet implemented",
      );
    });
  });

  describe("Library Adapter", () => {
    it("should return MySQL2 adapter for mysql2 library", () => {
      // WHEN
      const adapter = getLibraryAdapter("mysql2");

      // THEN
      expect(adapter).toBeDefined();
      expect(typeof adapter.isTargetMethod).toBe("function");
      expect(typeof adapter.extractSql).toBe("function");
      expect(typeof adapter.getExistingTypeAnnotation).toBe("function");
    });

    it("should throw error for unsupported prisma library", () => {
      // WHEN / THEN
      expect(() => getLibraryAdapter("prisma")).toThrow("Prisma adapter is not yet implemented");
    });

    it("should throw error for unsupported typeorm library", () => {
      // WHEN / THEN
      expect(() => getLibraryAdapter("typeorm")).toThrow("TypeORM adapter is not yet implemented");
    });

    it("should throw error for unsupported data-api library", () => {
      // WHEN / THEN
      expect(() => getLibraryAdapter("data-api")).toThrow(
        "AWS Data API adapter is not yet implemented",
      );
    });
  });

  describe("Type Guards", () => {
    it("should validate supported database engines", () => {
      expect(isSupportedDatabaseEngine("mysql")).toBe(true);
      expect(isSupportedDatabaseEngine("mariadb")).toBe(true);
      expect(isSupportedDatabaseEngine("postgresql")).toBe(true);
      expect(isSupportedDatabaseEngine("sqlite")).toBe(false);
      expect(isSupportedDatabaseEngine("oracle")).toBe(false);
    });

    it("should validate supported library types", () => {
      expect(isSupportedLibraryType("mysql2")).toBe(true);
      expect(isSupportedLibraryType("prisma")).toBe(true);
      expect(isSupportedLibraryType("typeorm")).toBe(true);
      expect(isSupportedLibraryType("data-api")).toBe(true);
      expect(isSupportedLibraryType("knex")).toBe(false);
      expect(isSupportedLibraryType("sequelize")).toBe(false);
    });
  });

  describe("Get Supported Types", () => {
    it("should return list of supported database engines", () => {
      // WHEN
      const engines = getSupportedDatabaseEngines();

      // THEN
      expect(engines).toContain("mysql");
      expect(engines).toContain("mariadb");
      expect(engines).toContain("postgresql");
    });

    it("should return list of supported library types", () => {
      // WHEN
      const libraries = getSupportedLibraryTypes();

      // THEN
      expect(libraries).toContain("mysql2");
      expect(libraries).toContain("prisma");
      expect(libraries).toContain("typeorm");
      expect(libraries).toContain("data-api");
    });
  });
});
