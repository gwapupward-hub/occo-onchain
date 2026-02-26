import express from "express";
import dotenv from "dotenv";
import { z } from "zod";
import { db } from "./db.js";
import { normalizeAndStore } from "./pipeline.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ issuer: "OCCO", ok: true, service: "indexer" });
});

/**
 * Webhook ingestion endpoint (Helius or any provider).
 * Configure your webhook provider to POST events here.
 *
 * This is intentionally generic: providers vary in payload shape.
 * Normalize inside adapters/pipeline.
 */
app.post("/webhook", async (req, res) => {
  try {
    const payload = req.body;
    await normalizeAndStore(payload);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

/**
 * Minimal DB bootstrap route for local dev.
 * Creates required tables if they do not exist.
 */
app.post("/bootstrap", async (_req, res) => {
  await bootstrap();
  res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 3002);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`OCCO Indexer listening on http://localhost:${port}`);
});

async function bootstrap() {
  const client = await db.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        address TEXT PRIMARY KEY,
        first_seen TIMESTAMP NOT NULL,
        last_activity TIMESTAMP NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS loan_events (
        id UUID PRIMARY KEY,
        wallet TEXT NOT NULL,
        protocol TEXT NOT NULL,
        event_type TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        timestamp TIMESTAMP NOT NULL
      );
    `);

    client.release();
  } catch (e) {
    client.release();
    throw e;
  }
}
