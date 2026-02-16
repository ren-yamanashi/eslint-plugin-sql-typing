import { afterEach, describe, expect, it, vi } from "vitest";

import { clearMemoCache, memoize } from "./memoize";

describe("Memoize", () => {
  afterEach(() => {
    // Clean up cache after each test
    clearMemoCache();
  });

  describe("Basic Operations", () => {
    it("should compute and cache value on first call", () => {
      // GIVEN
      const factory = vi.fn(() => 42);

      // WHEN
      const result = memoize({ key: "test-key", value: factory });

      // THEN
      expect(result).toBe(42);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("should return cached value on subsequent calls", () => {
      // GIVEN
      const factory = vi.fn(() => "computed-value");
      const key = "cached-key";

      // WHEN
      const result1 = memoize({ key, value: factory });
      const result2 = memoize({ key, value: factory });
      const result3 = memoize({ key, value: factory });

      // THEN
      expect(result1).toBe("computed-value");
      expect(result2).toBe("computed-value");
      expect(result3).toBe("computed-value");
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("should compute separately for different keys", () => {
      // GIVEN
      const factory1 = vi.fn(() => "value1");
      const factory2 = vi.fn(() => "value2");

      // WHEN
      const result1 = memoize({ key: "key1", value: factory1 });
      const result2 = memoize({ key: "key2", value: factory2 });

      // THEN
      expect(result1).toBe("value1");
      expect(result2).toBe("value2");
      expect(factory1).toHaveBeenCalledTimes(1);
      expect(factory2).toHaveBeenCalledTimes(1);
    });
  });

  describe("Type Handling", () => {
    it("should cache object values", () => {
      // GIVEN
      const obj = { id: 1, name: "test" };
      const factory = vi.fn(() => obj);

      // WHEN
      const result1 = memoize({ key: "obj-key", value: factory });
      const result2 = memoize({ key: "obj-key", value: factory });

      // THEN
      expect(result1).toBe(obj);
      expect(result2).toBe(obj);
      expect(result1).toEqual({ id: 1, name: "test" });
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("should cache array values", () => {
      // GIVEN
      const arr = [1, 2, 3];
      const factory = vi.fn(() => arr);

      // WHEN
      const result = memoize({ key: "arr-key", value: factory });

      // THEN
      expect(result).toBe(arr);
      expect(result).toEqual([1, 2, 3]);
    });

    it("should cache null values", () => {
      // GIVEN
      const factory = vi.fn(() => null);

      // WHEN
      const result1 = memoize({ key: "null-key", value: factory });
      const result2 = memoize({ key: "null-key", value: factory });

      // THEN
      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("should cache undefined values", () => {
      // GIVEN
      const factory = vi.fn((): undefined => undefined);

      // WHEN
      memoize({ key: "undefined-key", value: factory });
      memoize({ key: "undefined-key", value: factory });

      // THEN
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe("clearMemoCache", () => {
    it("should clear all cached values", () => {
      // GIVEN
      const factory = vi.fn(() => "value");
      memoize({ key: "key1", value: factory });
      memoize({ key: "key2", value: factory });
      expect(factory).toHaveBeenCalledTimes(2);

      // WHEN
      clearMemoCache();
      memoize({ key: "key1", value: factory });
      memoize({ key: "key2", value: factory });

      // THEN
      expect(factory).toHaveBeenCalledTimes(4);
    });

    it("should allow re-computation after clear", () => {
      // GIVEN
      let counter = 0;
      const factory = vi.fn(() => ++counter);
      const result1 = memoize({ key: "counter-key", value: factory });

      // WHEN
      clearMemoCache();
      const result2 = memoize({ key: "counter-key", value: factory });

      // THEN
      expect(result1).toBe(1);
      expect(result2).toBe(2);
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe("Key Handling", () => {
    it("should treat empty string as valid key", () => {
      // GIVEN
      const factory = vi.fn(() => "empty-key-value");

      // WHEN
      const result1 = memoize({ key: "", value: factory });
      const result2 = memoize({ key: "", value: factory });

      // THEN
      expect(result1).toBe("empty-key-value");
      expect(result2).toBe("empty-key-value");
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("should handle special characters in key", () => {
      // GIVEN
      const factory = vi.fn(() => "special-value");
      const key = "SELECT * FROM users WHERE name = 'test'; -- comment";

      // WHEN
      const result1 = memoize({ key, value: factory });
      const result2 = memoize({ key, value: factory });

      // THEN
      expect(result1).toBe("special-value");
      expect(result2).toBe("special-value");
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("should handle unicode characters in key", () => {
      // GIVEN
      const factory = vi.fn(() => "unicode-value");
      const key = "日本語キー🎉";

      // WHEN
      const result1 = memoize({ key, value: factory });
      const result2 = memoize({ key, value: factory });

      // THEN
      expect(result1).toBe("unicode-value");
      expect(result2).toBe("unicode-value");
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });
});
