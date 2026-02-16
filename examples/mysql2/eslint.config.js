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
      "sql-typing/check-sql": [
        "error",
        {
          database: {
            host: "localhost",
            port: 3306,
            user: "root",
            password: "test",
            database: "test_db",
          },
        },
      ],
    },
  },
];
