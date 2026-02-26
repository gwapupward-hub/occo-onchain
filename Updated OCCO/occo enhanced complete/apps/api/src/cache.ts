import { createClient } from "redis";
import type { WalletCreditScoreResultV0 } from "@occo/types";

let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  
  redisClient = createClient({ url: redisUrl });
  
  redisClient.on("error", (err) => {
    console.error("Redis cache error:", err);
  });

  await redisClient.connect();
  return redisClient;
}

const DEFAULT_CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = "occo:score:";

/**
 * Get cached score for a wallet
 */
export async function getCachedScore(wallet: string): Promise<WalletCreditScoreResultV0 | null> {
  try {
    const redis = await getRedisClient();
    const key = `${CACHE_PREFIX}${wallet}`;
    const cached = await redis.get(key);
    
    if (!cached) return null;
    
    return JSON.parse(cached) as WalletCreditScoreResultV0;
  } catch (error) {
    console.error("Error getting cached score:", error);
    return null;
  }
}

/**
 * Cache a score result
 */
export async function setCachedScore(
  wallet: string,
  score: WalletCreditScoreResultV0,
  ttl: number = DEFAULT_CACHE_TTL
): Promise<void> {
  try {
    const redis = await getRedisClient();
    const key = `${CACHE_PREFIX}${wallet}`;
    await redis.set(key, JSON.stringify(score), { EX: ttl });
  } catch (error) {
    console.error("Error setting cached score:", error);
  }
}

/**
 * Invalidate cached score for a wallet (called when new data arrives)
 */
export async function invalidateCachedScore(wallet: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    const key = `${CACHE_PREFIX}${wallet}`;
    await redis.del(key);
  } catch (error) {
    console.error("Error invalidating cached score:", error);
  }
}

/**
 * Cleanup function for graceful shutdown
 */
export async function closeRedisCache() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
