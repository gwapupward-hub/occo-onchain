import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import { scoreRouter } from "./v1/score.route.js";
import { healthRouter } from "./v1/health.route.js";
import { optionalApiKey } from "./middleware/auth.js";
import { rateLimiter } from "./middleware/rateLimit.js";

dotenv.config();

const app = express();

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") ?? "*",
}));

// Apply rate limiting globally (100 req/min for unauthenticated, more for tiers)
app.use(rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  keyPrefix: "occo:api",
}));

// Optional API key extraction (for rate limit tiers)
app.use(optionalApiKey);

app.use("/v1", healthRouter);
app.use("/v1", scoreRouter);

// Serve web static build optionally (not used in dev)
app.get("/", (_req, res) => {
  res.json({ issuer: "OCCO", status: "ok", service: "api" });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`OCCO API listening on http://localhost:${port}`);
});
