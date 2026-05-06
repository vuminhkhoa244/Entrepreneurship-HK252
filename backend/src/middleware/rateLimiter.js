/**
 * Rate Limiting Middleware
 * Prevents brute force attacks and abuse
 */

// Store for tracking rate limits (use Redis in production)
const requestCounts = new Map();
const CLEANUP_INTERVAL = 60000; // Clean up every minute

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.lastRequest > 3600000) {
      // 1 hour
      requestCounts.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Generic rate limiter
 */
export function createRateLimiter(windowMs, maxRequests) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();

    if (!requestCounts.has(key)) {
      requestCounts.set(key, { count: 1, firstRequest: now, lastRequest: now });
      return next();
    }

    const data = requestCounts.get(key);

    // Reset window if expired
    if (now - data.firstRequest > windowMs) {
      requestCounts.set(key, { count: 1, firstRequest: now, lastRequest: now });
      return next();
    }

    // Increment counter
    data.count++;
    data.lastRequest = now;

    if (data.count > maxRequests) {
      const retryAfter = Math.ceil((data.firstRequest + windowMs - now) / 1000);
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: retryAfter,
      });
    }

    next();
  };
}

/**
 * Strict rate limit for authentication endpoints
 * Prevents brute force login attempts
 */
export const authLimiter = createRateLimiter(
  parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 900000),
  parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 5)
);

/**
 * General API rate limit
 */
export const apiLimiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100)
);

/**
 * Strict limit for file uploads
 */
export const uploadLimiter = (req, res, next) => {
  const maxPerHour = parseInt(process.env.MAX_UPLOAD_REQUESTS_PER_HOUR || 10);
  const key = `upload:${req.user?.id || req.ip}`;
  const now = Date.now();

  if (!requestCounts.has(key)) {
    requestCounts.set(key, { count: 1, firstRequest: now });
    return next();
  }

  const data = requestCounts.get(key);

  if (now - data.firstRequest > 3600000) {
    // 1 hour
    requestCounts.set(key, { count: 1, firstRequest: now });
    return next();
  }

  data.count++;
  if (data.count > maxPerHour) {
    return res.status(429).json({
      error: 'Upload limit exceeded. Max ' + maxPerHour + ' uploads per hour',
    });
  }

  next();
};

/**
 * Rate limit for AI API calls
 */
export const aiLimiter = (req, res, next) => {
  const maxPerHour = parseInt(process.env.AI_RATE_LIMIT_PER_HOUR || 20);
  const key = `ai:${req.user?.id}`;
  const now = Date.now();

  if (!requestCounts.has(key)) {
    requestCounts.set(key, { count: 1, firstRequest: now });
    return next();
  }

  const data = requestCounts.get(key);

  if (now - data.firstRequest > 3600000) {
    // 1 hour
    requestCounts.set(key, { count: 1, firstRequest: now });
    return next();
  }

  data.count++;
  if (data.count > maxPerHour) {
    return res.status(429).json({
      error: 'AI API limit exceeded. Max ' + maxPerHour + ' requests per hour',
    });
  }

  next();
};
