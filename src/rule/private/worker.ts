/**
 * Worker utilities for async database operations
 *
 * Uses synckit to run async database queries synchronously in ESLint rules.
 * Worker path is resolved to dist/worker/worker.mjs from project root.
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { AnyFn, Syncify } from "synckit";
import { createSyncFn } from "synckit";

import type { CheckSQLWorkerHandler } from "../../worker/worker";

/**
 * Get the path to the worker file
 */
function getWorkerPath(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));

  // When running from built dist/index.mjs
  const distWorkerPath = join(currentDir, "worker", "worker.mjs");
  if (existsSync(distWorkerPath)) {
    return distWorkerPath;
  }

  // FIXME
  // When running from src (tests), find project root and use dist
  // src/rule/private -> src/rule -> src -> project root
  const projectRoot = join(currentDir, "..", "..", "..");
  return join(projectRoot, "dist", "worker", "worker.mjs");
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
