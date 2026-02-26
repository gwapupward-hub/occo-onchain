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

function extractEventsFromPayload(_payload: unknown): Array<{
  wallet: string;
  eventType: "borrow" | "repay" | "liquidation";
  amount: string;
  timestamp: number;
}> {
  // TODO: implement real extraction.
  // Return empty array until wire-up.
  return [];
}
