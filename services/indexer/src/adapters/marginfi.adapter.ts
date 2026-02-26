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

const MARGINFI_PROGRAM_ID = "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA";

export class MarginfiAdapter implements LendingAdapter {
  protocol = "marginfi";

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
        const timestamp = tx.timestamp * 1000;
        
        const isMarginfiTx = tx.instructions?.some(ix => ix.programId === MARGINFI_PROGRAM_ID);
        if (!isMarginfiTx) continue;

        const description = (tx.description || "").toLowerCase();
        const type = tx.type?.toLowerCase() || "";

        if (description.includes("borrow") || type.includes("borrow")) {
          const amount = this.extractAmount(tx);
          if (amount) {
            events.push({ wallet, eventType: "borrow", amount, timestamp });
          }
        }

        if (description.includes("repay") || description.includes("repaid") || type.includes("repay")) {
          const amount = this.extractAmount(tx);
          if (amount) {
            events.push({ wallet, eventType: "repay", amount, timestamp });
          }
        }

        if (description.includes("liquidat") || type.includes("liquidat")) {
          const amount = this.extractAmount(tx);
          events.push({ wallet, eventType: "liquidation", amount: amount || "0", timestamp });
        }
      }
    } catch (e) {
      console.error("Error extracting Marginfi events:", e);
    }

    return events;
  }

  private extractAmount(tx: HeliusTransaction): string | null {
    try {
      if (tx.accountData) {
        for (const account of tx.accountData) {
          if (account.tokenBalanceChanges && account.tokenBalanceChanges.length > 0) {
            const change = account.tokenBalanceChanges[0];
            if (change.rawTokenAmount?.tokenAmount) {
              return change.rawTokenAmount.tokenAmount;
            }
          }
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
