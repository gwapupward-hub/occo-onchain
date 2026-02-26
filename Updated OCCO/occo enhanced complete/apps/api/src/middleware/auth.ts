import { Request, Response, NextFunction } from "express";

/**
 * API Key authentication middleware.
 * 
 * Validates API keys from either:
 * - Authorization header: Bearer <key>
 * - x-api-key header: <key>
 * 
 * In production, API keys should be stored in a database with:
 * - Rate limit tiers
 * - Usage tracking
 * - Expiration dates
 */

interface AuthenticatedRequest extends Request {
  apiKey?: string;
  apiKeyTier?: string;
}

// In production, load from database or environment
const VALID_API_KEYS = new Map<string, { tier: string; name: string }>();

// Load API keys from environment
function loadApiKeys() {
  const keysEnv = process.env.API_KEYS || "";
  const keys = keysEnv.split(",").filter(Boolean);
  
  keys.forEach((keyConfig) => {
    const [key, tier = "free", name = "unknown"] = keyConfig.split(":");
    if (key) {
      VALID_API_KEYS.set(key, { tier, name });
    }
  });

  // Default dev key if none configured
  if (VALID_API_KEYS.size === 0 && process.env.NODE_ENV !== "production") {
    VALID_API_KEYS.set("dev_key_12345", { tier: "unlimited", name: "dev" });
    console.log("⚠️  Using default dev API key. Set API_KEYS env var for production.");
  }
}

loadApiKeys();

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  // Extract API key from headers
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers["x-api-key"] as string;
  
  let apiKey: string | undefined;
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    apiKey = authHeader.substring(7);
  } else if (apiKeyHeader) {
    apiKey = apiKeyHeader;
  }

  if (!apiKey) {
    return res.status(401).json({
      issuer: "OCCO",
      error: "missing_api_key",
      message: "API key required. Provide via Authorization: Bearer <key> or x-api-key header",
    });
  }

  const keyInfo = VALID_API_KEYS.get(apiKey);
  
  if (!keyInfo) {
    return res.status(401).json({
      issuer: "OCCO",
      error: "invalid_api_key",
      message: "Invalid API key",
    });
  }

  // Attach key info to request for downstream use
  (req as AuthenticatedRequest).apiKey = apiKey;
  (req as AuthenticatedRequest).apiKeyTier = keyInfo.tier;
  
  next();
}

/**
 * Optional middleware for public endpoints.
 * Allows both authenticated and unauthenticated requests,
 * but tracks the key if present for rate limiting.
 */
export function optionalApiKey(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers["x-api-key"] as string;
  
  let apiKey: string | undefined;
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    apiKey = authHeader.substring(7);
  } else if (apiKeyHeader) {
    apiKey = apiKeyHeader;
  }

  if (apiKey) {
    const keyInfo = VALID_API_KEYS.get(apiKey);
    if (keyInfo) {
      (req as AuthenticatedRequest).apiKey = apiKey;
      (req as AuthenticatedRequest).apiKeyTier = keyInfo.tier;
    }
  }
  
  next();
}
