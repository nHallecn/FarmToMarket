export const COPILOT_RATE_LIMIT = {
  requests: 10,
  windowMs: 60_000,
  maximumTrackedClients: 5_000,
} as const;

interface RateLimitBucket {
  count: number;
  windowStartedAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

const buckets = new Map<string, RateLimitBucket>();
let checksSinceCleanup = 0;

function cleanupExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStartedAt >= COPILOT_RATE_LIMIT.windowMs) {
      buckets.delete(key);
    }
  }

  while (buckets.size >= COPILOT_RATE_LIMIT.maximumTrackedClients) {
    const oldestKey = buckets.keys().next().value as string | undefined;
    if (!oldestKey) break;
    buckets.delete(oldestKey);
  }
}

export function consumeCopilotRateLimit(
  clientKey: string,
  now = Date.now(),
): RateLimitResult {
  checksSinceCleanup += 1;
  if (
    checksSinceCleanup >= 100 ||
    buckets.size >= COPILOT_RATE_LIMIT.maximumTrackedClients
  ) {
    cleanupExpiredBuckets(now);
    checksSinceCleanup = 0;
  }

  const existing = buckets.get(clientKey);
  const bucket =
    !existing || now - existing.windowStartedAt >= COPILOT_RATE_LIMIT.windowMs
      ? { count: 0, windowStartedAt: now }
      : existing;

  bucket.count += 1;
  buckets.delete(clientKey);
  buckets.set(clientKey, bucket);

  const allowed = bucket.count <= COPILOT_RATE_LIMIT.requests;
  const remaining = Math.max(0, COPILOT_RATE_LIMIT.requests - bucket.count);
  const retryAfterSeconds = allowed
    ? 0
    : Math.max(
        1,
        Math.ceil(
          (bucket.windowStartedAt + COPILOT_RATE_LIMIT.windowMs - now) / 1_000,
        ),
      );

  return {
    allowed,
    limit: COPILOT_RATE_LIMIT.requests,
    remaining,
    retryAfterSeconds,
  };
}

export function resetCopilotRateLimitForTests() {
  buckets.clear();
  checksSinceCleanup = 0;
}

