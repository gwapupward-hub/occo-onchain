import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import { scoreRouter } from "./v1/score.route.js";
import { healthRouter } from "./v1/health.route.js";

dotenv.config();

const app = express();

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") ?? "*",
}));

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
