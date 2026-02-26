import { randomUUID } from "crypto";
import type { LendingAdapter } from "./types.js";
import type { NormalizedLoanEvent } from "@occo/types";

/**
 * Solend adapter (stub).
 *
 * Replace `extractEventsFromPayload` with the real mapping for your chosen data source
 * (Helius, RPC logs, custom indexer, etc.).
 */
export class SolendAdapter implements LendingAdapter {
  protocol = "solend";

  parse(payload: unknown): NormalizedLoanEvent[] {
    const events = extractEventsFromPayload(payload);
    return events.map((e) => ({
      id: randomUUID(),
      wallet: e.wallet,
      protocol: this.protocol,
      eventType: e.eventType,
      amount: e.amount,
      timestamp: new Date(e.timestamp).toISOString(),
    }));
  }
}

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

const SOLEND_PROGRAM_ID = "So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo";
const MARGINFI_PROGRAM_ID = "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA";
const KAMINO_PROGRAM_ID = "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD";

function extractEventsFromPayload(payload: unknown): Array<{
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
      
      // Check if transaction involves Solend program
      const isSolendTx = tx.instructions?.some(ix => ix.programId === SOLEND_PROGRAM_ID);
      if (!isSolendTx) continue;

      // Parse transaction type from description or instruction data
      const description = (tx.description || "").toLowerCase();
      const type = tx.type?.toLowerCase() || "";

      // Detect borrow events
      if (description.includes("borrow") || type.includes("borrow")) {
        const amount = extractAmountFromTx(tx);
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
        const amount = extractAmountFromTx(tx);
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
        const amount = extractAmountFromTx(tx);
        events.push({
          wallet,
          eventType: "liquidation",
          amount: amount || "0",
          timestamp,
        });
      }
    }
  } catch (e) {
    // Silent fail - log in production
    console.error("Error extracting Solend events:", e);
  }

  return events;
}

function extractAmountFromTx(tx: HeliusTransaction): string | null {
  try {
    // Check token balance changes first
    if (tx.accountData) {
      for (const account of tx.accountData) {
        if (account.tokenBalanceChanges && account.tokenBalanceChanges.length > 0) {
          const change = account.tokenBalanceChanges[0];
          if (change.rawTokenAmount?.tokenAmount) {
            return change.rawTokenAmount.tokenAmount;
          }
        }
        // Fallback to native balance changes
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
