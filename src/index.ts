/**
 * eslint-plugin-sql-typing
 *
 * ESLint plugin for auto-generating TypeScript types from SQL queries.
 */

import type { TSESLint } from "@typescript-eslint/utils";

import { checkSqlRule } from "./rules/check-sql.js";

type RuleModule = TSESLint.RuleModule<string, unknown[]>;

/**
 * ESLint plugin interface
 */
interface Plugin {
  meta: {
    name: string;
    version: string;
  };
  rules: {
    "check-sql": RuleModule;
  };
  configs: {
    recommended: {
      plugins: {
        "sql-typing": Plugin;
      };
      rules: {
        "sql-typing/check-sql": string;
      };
    };
  };
}

/**
 * ESLint plugin instance
 */
const plugin: Plugin = {
  meta: {
    name: "eslint-plugin-sql-typing",
    version: "0.1.0",
  },
  rules: {
    "check-sql": checkSqlRule,
  },
  configs: {
    recommended: {
      plugins: {
        "sql-typing": null as unknown as Plugin,
      },
      rules: {
        "sql-typing/check-sql": "error",
      },
    },
  },
};

// Resolve self-reference for flat config
plugin.configs.recommended.plugins["sql-typing"] = plugin;

export default plugin;

// Named exports
export { checkSqlRule };
export * from "./types/index.js";
