import { db } from "./db.js";
import { SolendAdapter } from "./adapters/solend.adapter.js";
import type { NormalizedLoanEvent } from "@occo/types";

const adapters = [
  new SolendAdapter(),
];

/**
 * Normalize any incoming webhook payload into OCCO canonical events,
 * then store them in Postgres.
 */
export async function normalizeAndStore(payload: unknown) {
  const normalized: NormalizedLoanEvent[] = [];

  for (const adapter of adapters) {
    const out = adapter.parse(payload);
    if (out.length) normalized.push(...out);
  }

  if (!normalized.length) return;

  const client = await db.connect();
  try {
    for (const ev of normalized) {
      // wallets upsert
      await client.query(
        `
        INSERT INTO wallets (address, first_seen, last_activity)
        VALUES ($1, NOW(), NOW())
        ON CONFLICT (address)
        DO UPDATE SET last_activity = EXCLUDED.last_activity
        `,
        [ev.wallet],
      );

      // loan_events insert
      await client.query(
        `
        INSERT INTO loan_events (id, wallet, protocol, event_type, amount, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
        `,
        [ev.id, ev.wallet, ev.protocol, ev.eventType, ev.amount, ev.timestamp],
      );
    }
    client.release();
  } catch (e) {
    client.release();
    throw e;
  }
}
