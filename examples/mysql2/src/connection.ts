import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "test",
  database: "test_db",
});

export async function getConnection() {
  return pool.getConnection();
}
