/**
 * Worker utilities for async database operations
 *
 * Uses synckit to run async database queries synchronously in ESLint rules.
 * Worker path is resolved relative to the dist directory.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { AnyFn, Syncify } from "synckit";
import { createSyncFn } from "synckit";

import type { CheckSQLWorkerHandler } from "../../worker/worker";

/**
 * Get the path to the worker file
 */
function getWorkerPath(): string {
  // In built version, this file is at dist/index.mjs
  // Worker is at dist/worker/worker.mjs
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return join(currentDir, "worker", "worker.mjs");
}

/**
 * Define a worker with synckit
 */
function defineWorker<T extends AnyFn>(timeout: number): Syncify<T> {
  const workerPath = getWorkerPath();
  return createSyncFn<T>(workerPath, {
    timeout,
  });
}

export const workers = {
  checkSql: defineWorker<CheckSQLWorkerHandler>(
    1000 * 60, // 1 minute
  ),
};
