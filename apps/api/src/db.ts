import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await db.end();
  process.exit(0);
});
