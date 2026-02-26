import { db } from "./db.js";
import { SolendAdapter } from "./adapters/solend.adapter.js";
import { MarginfiAdapter } from "./adapters/marginfi.adapter.js";
import { KaminoAdapter } from "./adapters/kamino.adapter.js";
import type { NormalizedLoanEvent } from "@occo/types";

const adapters = [
  new SolendAdapter(),
  new MarginfiAdapter(),
  new KaminoAdapter(),
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
        DO UPDATE SET 
          last_activity = EXCLUDED.last_activity,
          updated_at = NOW()
        `,
        [ev.wallet],
      );

      // loan_events insert with signature tracking
      await client.query(
        `
        INSERT INTO loan_events (id, wallet, protocol, event_type, amount, timestamp, signature)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (signature) DO NOTHING
        WHERE signature IS NOT NULL
        `,
        [ev.id, ev.wallet, ev.protocol, ev.eventType, ev.amount, ev.timestamp, ev.id],
      );

      // Update lending positions based on event type
      await updateLendingPosition(client, ev);
    }
    
    client.release();
    
    // Invalidate cache for affected wallets
    // In production, publish to Redis pub/sub or message queue
    console.log(`Processed ${normalized.length} events`);
  } catch (e) {
    client.release();
    throw e;
  }
}

/**
 * Update lending position tracking based on loan events.
 * This enables accurate collateral ratio calculation.
 */
async function updateLendingPosition(client: any, event: NormalizedLoanEvent) {
  const { wallet, protocol, eventType, amount } = event;
  
  try {
    // Get or create position
    const position = await client.query(
      `SELECT * FROM lending_positions WHERE wallet = $1 AND protocol = $2`,
      [wallet, protocol]
    );

    if (position.rowCount === 0) {
      // Create new position
      await client.query(
        `
        INSERT INTO lending_positions 
        (id, wallet, protocol, collateral_amount, borrow_amount, opened_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, 0, 0, NOW(), NOW())
        `,
        [wallet, protocol]
      );
    }

    // Update position based on event type
    if (eventType === "borrow") {
      await client.query(
        `
        UPDATE lending_positions
        SET borrow_amount = borrow_amount + $1,
            collateral_ratio = CASE 
              WHEN borrow_amount + $1 > 0 
              THEN collateral_amount / (borrow_amount + $1)
              ELSE NULL 
            END,
            is_active = true,
            updated_at = NOW()
        WHERE wallet = $2 AND protocol = $3
        `,
        [amount, wallet, protocol]
      );
    } else if (eventType === "repay") {
      await client.query(
        `
        UPDATE lending_positions
        SET borrow_amount = GREATEST(0, borrow_amount - $1),
            collateral_ratio = CASE 
              WHEN GREATEST(0, borrow_amount - $1) > 0 
              THEN collateral_amount / GREATEST(0, borrow_amount - $1)
              ELSE NULL 
            END,
            is_active = CASE WHEN GREATEST(0, borrow_amount - $1) = 0 THEN false ELSE true END,
            closed_at = CASE WHEN GREATEST(0, borrow_amount - $1) = 0 THEN NOW() ELSE NULL END,
            updated_at = NOW()
        WHERE wallet = $2 AND protocol = $3
        `,
        [amount, wallet, protocol]
      );
    } else if (eventType === "liquidation") {
      await client.query(
        `
        UPDATE lending_positions
        SET is_active = false,
            closed_at = NOW(),
            updated_at = NOW()
        WHERE wallet = $1 AND protocol = $2
        `,
        [wallet, protocol]
      );
    }
  } catch (error) {
    console.error("Error updating lending position:", error);
  }
}
