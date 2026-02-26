import { Request, Response, NextFunction } from "express";
import { createClient } from "redis";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

interface AuthenticatedRequest extends Request {
  apiKey?: string;
  apiKeyTier?: string;
}

let redisClient: ReturnType<typeof createClient> | null = null;

// Initialize Redis client
async function getRedisClient() {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  
  redisClient = createClient({ url: redisUrl });
  
  redisClient.on("error", (err) => {
    console.error("Redis error:", err);
  });

  await redisClient.connect();
  return redisClient;
}

/**
 * Rate limiting middleware using Redis for distributed rate limiting.
 * Falls back to in-memory if Redis is unavailable.
 */
export function rateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests, keyPrefix = "ratelimit" } = config;
  
  // In-memory fallback
  const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    
    // Determine rate limit tier based on API key
    let limit = maxRequests;
    const tier = authReq.apiKeyTier;
    
    if (tier === "unlimited") {
      return next(); // No rate limiting for unlimited tier
    } else if (tier === "premium") {
      limit = maxRequests * 10;
    } else if (tier === "enterprise") {
      limit = maxRequests * 100;
    }

    // Use API key as identifier, fallback to IP
    const identifier = authReq.apiKey || req.ip || "unknown";
    const key = `${keyPrefix}:${identifier}`;

    try {
      const redis = await getRedisClient();
      
      // Try Redis first
      const current = await redis.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= limit) {
        const ttl = await redis.ttl(key);
        res.setHeader("X-RateLimit-Limit", limit.toString());
        res.setHeader("X-RateLimit-Remaining", "0");
        res.setHeader("X-RateLimit-Reset", (Date.now() + ttl * 1000).toString());
        
        return res.status(429).json({
          issuer: "OCCO",
          error: "rate_limit_exceeded",
          message: `Rate limit exceeded. Max ${limit} requests per ${windowMs / 1000}s`,
          retryAfter: ttl,
        });
      }

      // Increment counter
      if (count === 0) {
        await redis.set(key, "1", { EX: Math.floor(windowMs / 1000) });
      } else {
        await redis.incr(key);
      }

      res.setHeader("X-RateLimit-Limit", limit.toString());
      res.setHeader("X-RateLimit-Remaining", (limit - count - 1).toString());
      
      next();
    } catch (redisError) {
      console.error("Redis rate limit error, falling back to in-memory:", redisError);
      
      // In-memory fallback
      const now = Date.now();
      const record = inMemoryStore.get(key);

      if (record && now < record.resetAt) {
        if (record.count >= limit) {
          return res.status(429).json({
            issuer: "OCCO",
            error: "rate_limit_exceeded",
            message: `Rate limit exceeded. Max ${limit} requests per ${windowMs / 1000}s`,
          });
        }
        record.count++;
      } else {
        inMemoryStore.set(key, { count: 1, resetAt: now + windowMs });
      }

      next();
    }
  };
}

/**
 * Cleanup function for graceful shutdown
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
