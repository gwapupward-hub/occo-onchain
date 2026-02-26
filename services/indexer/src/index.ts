import express from "express";
import dotenv from "dotenv";
import { z } from "zod";
import { db } from "./db.js";
import { normalizeAndStore } from "./pipeline.js";
import { runMigrations } from "./migrations.js";
import { verifyWebhookSignature } from "./middleware/webhookAuth.js";

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
app.post("/webhook", verifyWebhookSignature, async (req, res) => {
  try {
    const payload = req.body;
    await normalizeAndStore(payload);
    res.json({ ok: true });
  } catch (e) {
    console.error("Webhook processing error:", e);
    res.status(500).json({ ok: false });
  }
});

const port = Number(process.env.PORT ?? 3002);

// Run migrations on startup
runMigrations()
  .then(() => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`OCCO Indexer listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to run migrations:", err);
    process.exit(1);
  });
