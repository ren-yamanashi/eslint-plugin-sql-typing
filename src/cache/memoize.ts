/**
 * Simple memoization utility for caching expensive computations
 *
 * Uses a module-level Map to cache results across ESLint rule invocations.
 * Cache persists for the lifetime of the ESLint process.
 */

const memoized = new Map<string, unknown>();

/**
 * Memoize a computation by key
 *
 * @param params.key - Cache key (should be unique for each computation)
 * @param params.value - Factory function to compute the value if not cached
 * @returns The cached or newly computed value
 */
export function memoize<T>(params: { key: string; value: () => T }): T {
  const { key, value } = params;

  if (memoized.has(key)) {
    return memoized.get(key) as T;
  }

  const result = value();
  memoized.set(key, result);

  return result;
}

/**
 * Clear all memoized values (useful for testing)
 */
export function clearMemoCache(): void {
  memoized.clear();
}
