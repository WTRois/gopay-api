const config = require("../config/env");

const MAX_TRACKED_KEYS = 10000;

/**
 * Fixed-window in-memory rate limiter (single-instance deployment).
 * lazy: swap for a shared store (Redis) only if the app is scaled horizontally.
 */
function createRateLimiter({
  windowMs = config.rateLimitWindowMs,
  max = config.rateLimitMax,
  keyGenerator,
  message = "Terlalu banyak permintaan. Silakan coba lagi nanti.",
} = {}) {
  const buckets = new Map(); // key -> { count, resetAt }
  let lastSweep = Date.now();

  const sweep = (now) => {
    if (now - lastSweep < windowMs) return;
    lastSweep = now;
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  };

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    sweep(now);

    const key = keyGenerator(req);
    if (!key) return next();

    // Guard against memory exhaustion from a flood of unique keys.
    if (buckets.size >= MAX_TRACKED_KEYS) buckets.clear();

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    const remaining = Math.max(0, max - bucket.count);
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ success: false, message });
    }

    next();
  };
}

const keyByIp = (req) => req.ip || req.socket?.remoteAddress || "unknown";
const keyByQrisId = (req) => req.params?.id || keyByIp(req);

const statusRateLimiter = createRateLimiter({ keyGenerator: keyByQrisId });
const ipRateLimiter = createRateLimiter({ keyGenerator: keyByIp });

module.exports = {
  createRateLimiter,
  keyByIp,
  keyByQrisId,
  statusRateLimiter,
  ipRateLimiter,
};
