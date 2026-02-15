import tsParser from "@typescript-eslint/parser";
import sqlTyping from "eslint-plugin-sql-typing";

export default [
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      "sql-typing": sqlTyping,
    },
    rules: {
      // Currently works without options (uses mock schema)
      "sql-typing/check-sql": "error",
    },
  },
];
