import type {
  WalletCreditInputsV0,
  WalletCreditScoreResultV0,
  CreditScoreBreakdownV0,
  RiskTier,
  PublicFlag,
  ModelVersion,
} from "@occo/types";

const MODEL_VERSION: ModelVersion = "v0.1";

const SCORE_MIN = 300;
const SCORE_MAX = 850;
const BASE = 500;

const AGE_MAX_YEARS = 5;
const AGE_POINTS_PER_YEAR = 20;

const REPAYMENT_MAX = 200;

const DIVERSITY_POINTS_PER_PROTOCOL = 10;
const DIVERSITY_MAX = 50;

const LIQUIDATION_PENALTY_PER = 100;
const LIQUIDATION_PENALTY_MAX = 200;

const RISK_PENALTY_PER_EVENT = 50;
const RISK_PENALTY_MAX = 100;

const INACTIVITY_PENALTY_MAX = 50;

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function safeInt(n: unknown, fallback = 0): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.trunc(x);
}

function safeNum(n: unknown, fallback = 0): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return fallback;
  return x;
}

function toIsoNow(): string {
  return new Date().toISOString();
}

export function computeAgeScore(walletAgeDays: number): number {
  const days = Math.max(0, safeNum(walletAgeDays, 0));
  const years = Math.min(days / 365, AGE_MAX_YEARS);
  return clamp(years * AGE_POINTS_PER_YEAR, 0, 100);
}

export function computeRepaymentScore(totalLoans: number, repaidLoans: number): number {
  const total = Math.max(0, safeInt(totalLoans, 0));
  const repaid = Math.max(0, safeInt(repaidLoans, 0));
  if (total === 0) return 0;
  const r = Math.min(repaid, total);
  return clamp((r / total) * REPAYMENT_MAX, 0, REPAYMENT_MAX);
}

export function computeDiversityScore(uniqueLendingProtocols: number): number {
  const p = Math.max(0, safeInt(uniqueLendingProtocols, 0));
  return clamp(p * DIVERSITY_POINTS_PER_PROTOCOL, 0, DIVERSITY_MAX);
}

export function computeHealthScore(avgCollateralRatio: number | null): number {
  if (avgCollateralRatio === null || avgCollateralRatio === undefined) return 10;
  const ratio = safeNum(avgCollateralRatio, 0);
  if (ratio >= 3.0) return 100;
  if (ratio >= 2.0) return 70;
  if (ratio >= 1.5) return 40;
  return 10;
}

export function computeLiquidationPenalty(liquidations: number): number {
  const l = Math.max(0, safeInt(liquidations, 0));
  return clamp(l * LIQUIDATION_PENALTY_PER, 0, LIQUIDATION_PENALTY_MAX);
}

export function computeRiskPenalty(highRiskEvents: number): number {
  const e = Math.max(0, safeInt(highRiskEvents, 0));
  return clamp(e * RISK_PENALTY_PER_EVENT, 0, RISK_PENALTY_MAX);
}

export function computeInactivityPenalty(lastActivityDays: number): number {
  const d = Math.max(0, safeNum(lastActivityDays, 0));
  if (d > 180) return INACTIVITY_PENALTY_MAX;
  if (d > 90) return 25;
  return 0;
}

export function computeConfidence(inputs: WalletCreditInputsV0): number {
  const ageDays = Math.max(0, safeNum(inputs.walletAgeDays, 0));
  const totalLoans = Math.max(0, safeInt(inputs.totalLoans, 0));
  const protocols = Math.max(0, safeInt(inputs.uniqueLendingProtocols, 0));

  let c = 0.5;
  c += clamp(ageDays / (365 * 2), 0, 1) * 0.15;
  c += clamp(totalLoans / 10, 0, 1) * 0.25;
  c += clamp(protocols / 3, 0, 1) * 0.10;

  if (ageDays < 30) c -= 0.15;
  if (ageDays < 7) c -= 0.10;

  return clamp(c, 0.1, 0.95);
}

export function scoreToRiskTier(score: number): RiskTier {
  const s = safeInt(score, SCORE_MIN);
  if (s >= 750) return "A";
  if (s >= 650) return "B";
  if (s >= 550) return "C";
  if (s >= 450) return "D";
  return "E";
}

export function derivePublicFlags(inputs: WalletCreditInputsV0): PublicFlag[] {
  const flags: PublicFlag[] = [];

  const ageDays = Math.max(0, safeNum(inputs.walletAgeDays, 0));
  const lastDays = Math.max(0, safeNum(inputs.lastActivityDays, 0));
  const totalLoans = Math.max(0, safeInt(inputs.totalLoans, 0));
  const liquidations = Math.max(0, safeInt(inputs.liquidations, 0));
  const highRiskEvents = Math.max(0, safeInt(inputs.highRiskEvents, 0));

  if (ageDays < 30) flags.push("new_wallet");
  if (totalLoans === 0) flags.push("no_lending_history");

  if (liquidations >= 1) flags.push("past_liquidation");
  if (liquidations >= 2) flags.push("multiple_liquidations");

  if (highRiskEvents >= 1) flags.push("high_risk_exposure");

  if (lastDays > 90) flags.push("inactive_wallet");

  return flags;
}

export function scoreWalletCreditV0(inputs: WalletCreditInputsV0): WalletCreditScoreResultV0 {
  const normalized: WalletCreditInputsV0 = {
    wallet: String(inputs.wallet ?? "").trim(),
    walletAgeDays: Math.max(0, safeNum(inputs.walletAgeDays, 0)),
    lastActivityDays: Math.max(0, safeNum(inputs.lastActivityDays, 0)),
    totalLoans: Math.max(0, safeInt(inputs.totalLoans, 0)),
    repaidLoans: Math.max(0, safeInt(inputs.repaidLoans, 0)),
    liquidations: Math.max(0, safeInt(inputs.liquidations, 0)),
    uniqueLendingProtocols: Math.max(0, safeInt(inputs.uniqueLendingProtocols, 0)),
    avgCollateralRatio:
      inputs.avgCollateralRatio === null || inputs.avgCollateralRatio === undefined
        ? null
        : safeNum(inputs.avgCollateralRatio, null as unknown as number),
    highRiskEvents: Math.max(0, safeInt(inputs.highRiskEvents, 0)),
  };

  const ageScore = computeAgeScore(normalized.walletAgeDays);
  const repaymentScore = computeRepaymentScore(normalized.totalLoans, normalized.repaidLoans);
  const diversityScore = computeDiversityScore(normalized.uniqueLendingProtocols);
  const healthScore = computeHealthScore(normalized.avgCollateralRatio);

  const liquidationPenalty = computeLiquidationPenalty(normalized.liquidations);
  const riskPenalty = computeRiskPenalty(normalized.highRiskEvents);
  const inactivityPenalty = computeInactivityPenalty(normalized.lastActivityDays);

  const rawScore =
    BASE +
    ageScore +
    repaymentScore +
    diversityScore +
    healthScore -
    liquidationPenalty -
    riskPenalty -
    inactivityPenalty;

  const finalScore = clamp(Math.round(rawScore), SCORE_MIN, SCORE_MAX);
  const riskTier = scoreToRiskTier(finalScore);
  const confidence = computeConfidence(normalized);
  const flags = derivePublicFlags(normalized);

  const breakdown: CreditScoreBreakdownV0 = {
    base: BASE,
    ageScore: Math.round(ageScore),
    repaymentScore: Math.round(repaymentScore),
    diversityScore: Math.round(diversityScore),
    healthScore: Math.round(healthScore),
    liquidationPenalty: Math.round(liquidationPenalty),
    riskPenalty: Math.round(riskPenalty),
    inactivityPenalty: Math.round(inactivityPenalty),
    rawScore: Math.round(rawScore),
    finalScore,
  };

  return {
    wallet: normalized.wallet,
    issuer: "OCCO",
    modelVersion: MODEL_VERSION,
    score: finalScore,
    riskTier,
    confidence: Number(confidence.toFixed(2)),
    flags,
    breakdown,
    computedAt: toIsoNow(),
  };
}
