import { getRedis } from '../config/redis.js';

const TTL_SECONDS = 86400; // 24 hours

/**
 * idempotency — Checks Redis for duplicate requests using the
 * X-Idempotency-Key header. Prevents double-debits on payment endpoints.
 *
 * Status values stored in Redis:
 *   "processing" — first request, ongoing
 *   JSON string  — completed response (replayed on duplicate)
 */
import { v4 as uuidv4 } from 'uuid';

const memoryCache = new Map();

/**
 * Clean expired keys from memory cache periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memoryCache.entries()) {
    if (v.expiresAt < now) memoryCache.delete(k);
  }
}, 60000);

export const idempotency = async (req, res, next) => {
  const key = req.headers['x-idempotency-key'] || uuidv4();
  req.idempotencyKey = key;

  try {
    const redis = getRedis();
    if (redis && redis.status === 'ready') {
      const redisKey = `idem:${key}`;
      const existing = await redis.get(redisKey);

      if (existing === 'processing') {
        return res.status(409).json({
          success: false,
          message: 'Request is currently being processed. Please wait.',
        });
      }

      if (existing) {
        try {
          const cached = JSON.parse(existing);
          return res.status(200).json({ ...cached, _replayed: true });
        } catch {}
      }

      await redis.set(redisKey, 'processing', 'EX', 30);

      const originalJson = res.json.bind(res);
      res.json = async (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          await redis.set(redisKey, JSON.stringify(body), 'EX', TTL_SECONDS).catch(() => {});
        } else {
          await redis.del(redisKey).catch(() => {});
        }
        return originalJson(body);
      };

      return next();
    }
  } catch (err) {
    // Redis unavailable, fallback to in-memory map
  }

  // In-memory fallback
  const cached = memoryCache.get(key);
  if (cached) {
    if (cached.status === 'processing') {
      return res.status(409).json({
        success: false,
        message: 'Request is currently being processed. Please wait.',
      });
    }
    if (cached.body && cached.expiresAt > Date.now()) {
      return res.status(200).json({ ...cached.body, _replayed: true });
    }
  }

  memoryCache.set(key, { status: 'processing', expiresAt: Date.now() + 30000 });

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      memoryCache.set(key, { status: 'done', body, expiresAt: Date.now() + TTL_SECONDS * 1000 });
    } else {
      memoryCache.delete(key);
    }
    return originalJson(body);
  };

  next();
};
