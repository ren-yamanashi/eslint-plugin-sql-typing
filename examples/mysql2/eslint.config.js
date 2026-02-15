import sqlTyping from "eslint-plugin-sql-typing";

export default [
  {
    files: ["src/**/*.ts"],
    plugins: {
      "sql-typing": sqlTyping,
    },
    rules: {
      "sql-typing/check-sql": [
        "error",
        {
          connections: [
            {
              driver: "mysql",
              databaseUrl: "mysql://root:test@localhost:3306/test_db",
              targets: [{ method: "execute" }, { method: "query" }],
            },
          ],
        },
      ],
    },
  },
];
