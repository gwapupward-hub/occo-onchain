export type RiskTier = "A" | "B" | "C" | "D" | "E";

export type ModelVersion = "v0.1";

export type PublicFlag =
  | "no_lending_history"
  | "past_liquidation"
  | "multiple_liquidations"
  | "high_risk_exposure"
  | "inactive_wallet"
  | "new_wallet";

export interface WalletCreditInputsV0 {
  wallet: string;

  walletAgeDays: number;
  lastActivityDays: number;

  totalLoans: number;
  repaidLoans: number;
  liquidations: number;

  uniqueLendingProtocols: number;

  avgCollateralRatio: number | null;

  highRiskEvents: number;
  
  // Activity metrics for volume-based scoring
  totalTransactionCount?: number;
  totalVolumeUSD?: number;
  avgPositionSizeUSD?: number;
}

export interface CreditScoreBreakdownV0 {
  base: number;
  ageScore: number;
  repaymentScore: number;
  diversityScore: number;
  healthScore: number;
  activityScore: number;
  liquidationPenalty: number;
  riskPenalty: number;
  inactivityPenalty: number;
  rawScore: number;
  finalScore: number;
}

export interface WalletCreditScoreResultV0 {
  wallet: string;
  issuer: "OCCO";
  modelVersion: ModelVersion;
  score: number;
  riskTier: RiskTier;
  confidence: number;
  flags: PublicFlag[];
  breakdown: CreditScoreBreakdownV0;
  computedAt: string;
}

export interface NormalizedLoanEvent {
  id: string;
  wallet: string;
  protocol: string;
  eventType: "borrow" | "repay" | "liquidation";
  amount: string; // store as string to avoid float issues
  timestamp: string; // ISO
}
