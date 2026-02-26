import { Router } from "express";
import { z } from "zod";
import { getWalletMetrics } from "../walletMetrics.js";
import { scoreWalletCreditV0 } from "@occo/scoring";
import { getCachedScore, setCachedScore } from "../cache.js";

export const scoreRouter = Router();

const walletSchema = z.string().min(32).max(64);

scoreRouter.get("/score/:wallet", async (req, res) => {
  const wallet = walletSchema.safeParse(req.params.wallet);
  if (!wallet.success) {
    return res.status(400).json({ issuer: "OCCO", error: "invalid_wallet" });
  }

  // Check cache first
  const cached = await getCachedScore(wallet.data);
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.json(cached);
  }

  // Compute fresh score
  const metrics = await getWalletMetrics(wallet.data);
  const result = scoreWalletCreditV0(metrics);

  // Cache the result
  await setCachedScore(wallet.data, result);
  res.setHeader("X-Cache", "MISS");

  return res.json(result);
});

// Placeholder for future full report
scoreRouter.get("/report/:wallet", async (req, res) => {
  const wallet = walletSchema.safeParse(req.params.wallet);
  if (!wallet.success) {
    return res.status(400).json({ issuer: "OCCO", error: "invalid_wallet" });
  }
  const metrics = await getWalletMetrics(wallet.data);
  const result = scoreWalletCreditV0(metrics);
  return res.json({
    ...result,
    report: {
      metrics,
      notes: [
        "This is a v1 placeholder report. Expand with protocol-specific history and explanations.",
      ],
    },
  });
});
