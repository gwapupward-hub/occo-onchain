import type { WalletCreditInputsV0 } from "@occo/types";
import { db } from "./db.js";

/**
 * v1 behavior:
 * - If the indexer has data in Postgres, compute from real facts.
 * - If not, return a safe placeholder with low confidence.
 *
 * This keeps the API deployable immediately while the indexer matures.
 */
export async function getWalletMetrics(wallet: string): Promise<WalletCreditInputsV0> {
  try {
    const client = await db.connect();
    try {
      // wallets table
      const w = await client.query(
        "SELECT address, first_seen, last_activity FROM wallets WHERE address = $1 LIMIT 1",
        [wallet],
      );

      // loan_events table
      const ev = await client.query(
        "SELECT protocol, event_type FROM loan_events WHERE wallet = $1",
        [wallet],
      );

      client.release();

      if (w.rowCount === 0) {
        return placeholder(wallet);
      }

      const firstSeen = new Date(w.rows[0].first_seen);
      const lastActivity = new Date(w.rows[0].last_activity);

      const walletAgeDays = Math.max(0, Math.floor((Date.now() - firstSeen.getTime()) / (1000 * 60 * 60 * 24)));
      const lastActivityDays = Math.max(0, Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)));

      const protocols = new Set<string>();
      let totalLoans = 0;
      let repaidLoans = 0;
      let liquidations = 0;

      // Minimal v1: infer loans from borrow/repay counts (upgrade later with position-level accounting)
      for (const row of ev.rows) {
        protocols.add(String(row.protocol));
        if (row.event_type === "borrow") totalLoans += 1;
        if (row.event_type === "repay") repaidLoans += 1;
        if (row.event_type === "liquidation") liquidations += 1;
      }

      // avgCollateralRatio requires protocol-specific position indexing; set null in v1 until implemented.
      const avgCollateralRatio = null;

      return {
        wallet,
        walletAgeDays,
        lastActivityDays,
        totalLoans,
        repaidLoans: Math.min(repaidLoans, totalLoans),
        liquidations,
        uniqueLendingProtocols: protocols.size,
        avgCollateralRatio,
        highRiskEvents: 0,
      };
    } catch (e) {
      client.release();
      return placeholder(wallet);
    }
  } catch {
    return placeholder(wallet);
  }
}

function placeholder(wallet: string): WalletCreditInputsV0 {
  return {
    wallet,
    walletAgeDays: 0,
    lastActivityDays: 999,
    totalLoans: 0,
    repaidLoans: 0,
    liquidations: 0,
    uniqueLendingProtocols: 0,
    avgCollateralRatio: null,
    highRiskEvents: 0,
  };
}
