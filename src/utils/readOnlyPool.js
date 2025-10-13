import dotenv from "dotenv";
import mysql from "mysql2/promise";


dotenv.config();

export const readOnlyPool = mysql.createPool({
  host: process.env.SQL_HOST,
  port: process.env.SQL_PORT,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DATABASE,
  ssl: {
    rejectUnauthorized: false,
  },
  waitForConnections: true,
});
