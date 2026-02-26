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

      // Get active lending positions for collateral ratio
      const positions = await client.query(
        `SELECT 
          AVG(collateral_ratio) as avg_ratio,
          COUNT(*) as position_count
         FROM lending_positions 
         WHERE wallet = $1 
         AND is_active = true
         AND collateral_ratio IS NOT NULL`,
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

      // Query lending positions for collateral ratio calculation
      const positions = await client.query(
        `SELECT 
          collateral_amount, 
          borrow_amount, 
          collateral_ratio 
         FROM lending_positions 
         WHERE wallet = $1 AND is_active = true`,
        [wallet]
      );

      // Calculate average collateral ratio from active positions
      let avgCollateralRatio: number | null = null;
      if (positions.rowCount > 0) {
        const ratios = positions.rows
          .map(p => parseFloat(String(p.collateral_ratio)))
          .filter(r => r && !isNaN(r) && r > 0);
        
        if (ratios.length > 0) {
          avgCollateralRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
        }
      }

      // Query activity metrics for volume scoring
      const activityMetrics = await client.query(
        `SELECT 
          COUNT(*) as total_transactions,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_volume,
          COALESCE(AVG(CAST(amount AS DECIMAL)), 0) as avg_position_size
         FROM loan_events 
         WHERE wallet = $1`,
        [wallet]
      );

      const activity = activityMetrics.rows[0] || { 
        total_transactions: 0, 
        total_volume: 0, 
        avg_position_size: 0 
      };

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

      // Get average collateral ratio from active positions
      const avgCollateralRatio = positions.rows[0]?.avg_ratio 
        ? parseFloat(positions.rows[0].avg_ratio) 
        : null;

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
        totalTransactionCount: parseInt(String(activity.total_transactions)) || 0,
        totalVolumeUSD: parseFloat(String(activity.total_volume)) || 0,
        avgPositionSizeUSD: parseFloat(String(activity.avg_position_size)) || 0,
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
    totalTransactionCount: 0,
    totalVolumeUSD: 0,
    avgPositionSizeUSD: 0,
  };
}
