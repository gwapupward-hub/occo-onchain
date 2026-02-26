import type { NormalizedLoanEvent } from "@occo/types";

export interface LendingAdapter {
  protocol: string;
  parse(payload: unknown): NormalizedLoanEvent[];
}
