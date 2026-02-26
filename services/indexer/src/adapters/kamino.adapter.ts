import { randomUUID } from "crypto";
import type { LendingAdapter } from "./types.js";
import type { NormalizedLoanEvent } from "@occo/types";

interface HeliusTransaction {
  signature?: string;
  timestamp?: number;
  feePayer?: string;
  accountData?: Array<{
    account?: string;
    nativeBalanceChange?: number;
    tokenBalanceChanges?: Array<{
      mint?: string;
      rawTokenAmount?: {
        tokenAmount?: string;
      };
    }>;
  }>;
  instructions?: Array<{
    programId?: string;
    accounts?: string[];
    data?: string;
  }>;
  type?: string;
  description?: string;
}

interface HeliusWebhook {
  transaction?: HeliusTransaction;
  transactions?: HeliusTransaction[];
}

const KAMINO_PROGRAM_ID = "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD";

/**
 * Kamino Finance adapter for parsing lending events from Helius webhooks.
 * 
 * Kamino is a major Solana lending protocol with automated yield strategies.
 * This adapter normalizes Kamino borrow/repay/liquidation events into the OCCO canonical format.
 */
export class KaminoAdapter implements LendingAdapter {
  protocol = "kamino";

  parse(payload: unknown): NormalizedLoanEvent[] {
    const events = this.extractEvents(payload);
    return events.map((e) => ({
      id: randomUUID(),
      wallet: e.wallet,
      protocol: this.protocol,
      eventType: e.eventType,
      amount: e.amount,
      timestamp: new Date(e.timestamp).toISOString(),
    }));
  }

  private extractEvents(payload: unknown): Array<{
    wallet: string;
    eventType: "borrow" | "repay" | "liquidation";
    amount: string;
    timestamp: number;
  }> {
    const events: Array<{
      wallet: string;
      eventType: "borrow" | "repay" | "liquidation";
      amount: string;
      timestamp: number;
    }> = [];

    try {
      const webhook = payload as HeliusWebhook;
      const transactions = webhook.transactions || (webhook.transaction ? [webhook.transaction] : []);

      for (const tx of transactions) {
        if (!tx || !tx.feePayer || !tx.timestamp) continue;

        const wallet = tx.feePayer;
        const timestamp = tx.timestamp * 1000; // Convert to milliseconds
        
        // Check if transaction involves Kamino program
        const isKaminoTx = tx.instructions?.some(ix => ix.programId === KAMINO_PROGRAM_ID);
        if (!isKaminoTx) continue;

        // Parse transaction type from description or instruction data
        const description = (tx.description || "").toLowerCase();
        const type = tx.type?.toLowerCase() || "";

        // Detect borrow events
        if (description.includes("borrow") || type.includes("borrow")) {
          const amount = this.extractAmount(tx);
          if (amount) {
            events.push({
              wallet,
              eventType: "borrow",
              amount,
              timestamp,
            });
          }
        }

        // Detect repay events
        if (description.includes("repay") || description.includes("repaid") || type.includes("repay")) {
          const amount = this.extractAmount(tx);
          if (amount) {
            events.push({
              wallet,
              eventType: "repay",
              amount,
              timestamp,
            });
          }
        }

        // Detect liquidation events
        if (description.includes("liquidat") || type.includes("liquidat")) {
          const amount = this.extractAmount(tx);
          events.push({
            wallet,
            eventType: "liquidation",
            amount: amount || "0",
            timestamp,
          });
        }
      }
    } catch (e) {
      console.error("Error extracting Kamino events:", e);
    }

    return events;
  }

  private extractAmount(tx: HeliusTransaction): string | null {
    try {
      // Check token balance changes first (most common for DeFi)
      if (tx.accountData) {
        for (const account of tx.accountData) {
          if (account.tokenBalanceChanges && account.tokenBalanceChanges.length > 0) {
            const change = account.tokenBalanceChanges[0];
            if (change.rawTokenAmount?.tokenAmount) {
              return change.rawTokenAmount.tokenAmount;
            }
          }
          // Fallback to native SOL balance changes
          if (account.nativeBalanceChange && account.nativeBalanceChange !== 0) {
            return Math.abs(account.nativeBalanceChange).toString();
          }
        }
      }
    } catch (e) {
      console.error("Error extracting amount:", e);
    }
    return null;
  }
}
