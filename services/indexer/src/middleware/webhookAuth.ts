import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

/**
 * Webhook signature verification middleware.
 * 
 * Verifies that incoming webhooks are from a trusted source
 * by validating HMAC signatures.
 */

export function verifyWebhookSignature(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.WEBHOOK_SECRET || process.env.HELIUS_WEBHOOK_SECRET;
  
  // Skip verification in development if no secret is set
  if (!secret && process.env.NODE_ENV !== "production") {
    console.warn("⚠️  Webhook signature verification disabled (no secret configured)");
    return next();
  }

  if (!secret) {
    return res.status(500).json({
      issuer: "OCCO",
      error: "configuration_error",
      message: "Webhook secret not configured",
    });
  }

  // Get signature from headers (various providers use different header names)
  const signature = 
    req.headers["x-webhook-signature"] as string ||
    req.headers["x-helius-signature"] as string ||
    req.headers["x-signature"] as string;

  if (!signature) {
    return res.status(401).json({
      issuer: "OCCO",
      error: "missing_signature",
      message: "Webhook signature required",
    });
  }

  try {
    // Compute expected signature
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
      throw new Error("Invalid signature length");
    }

    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      throw new Error("Signature mismatch");
    }

    next();
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return res.status(401).json({
      issuer: "OCCO",
      error: "invalid_signature",
      message: "Webhook signature verification failed",
    });
  }
}
