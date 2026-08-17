import ApiError from '@/common/errors/api.error.js';
import {
  rateLimitAuthMax,
  rateLimitAuthWindowMs,
  rateLimitCheckoutMax,
  rateLimitCheckoutWindowMs,
  rateLimitPasswordResetMax,
  rateLimitPasswordResetWindowMs,
  rateLimitPaymentMax,
  rateLimitPaymentWindowMs,
  rateLimitUploadMax,
  rateLimitUploadWindowMs,
  rateLimitWebhookMax,
  rateLimitWebhookWindowMs,
} from '@/config/env.config.js';

const stores = new Map();
let cleanupInterval = null;

const getStore = (name) => {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }

  return stores.get(name);
};

const getClientKey = (req) => {
  const userId = req.user?.id || req.user?._id;
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ipAddress = req.ip || forwardedFor || req.socket?.remoteAddress || 'unknown';

  return userId ? `user:${userId}` : `ip:${ipAddress}`;
};

const startCleanup = () => {
  if (cleanupInterval) {
    return;
  }

  cleanupInterval = setInterval(() => {
    const now = Date.now();

    stores.forEach((store) => {
      store.forEach((entry, key) => {
        if (entry.resetAt <= now) {
          store.delete(key);
        }
      });
    });
  }, 60000);

  cleanupInterval.unref?.();
};

const createRateLimiter = ({
  keyPrefix,
  max,
  message,
  windowMs,
}) => {
  startCleanup();
  const store = getStore(keyPrefix);

  return (req, res, next) => {
    const now = Date.now();
    const key = `${keyPrefix}:${getClientKey(req)}`;
    const current = store.get(key);
    const entry = current && current.resetAt > now
      ? current
      : { count: 0, resetAt: now + windowMs };

    entry.count += 1;
    store.set(key, entry);

    const remaining = Math.max(max - entry.count, 0);
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return next(new ApiError(429, message || 'Too many requests. Please try again later.'));
    }

    return next();
  };
};

const rateLimiters = {
  auth: createRateLimiter({
    keyPrefix: 'auth',
    max: rateLimitAuthMax,
    message: 'Too many authentication attempts. Please try again later.',
    windowMs: rateLimitAuthWindowMs,
  }),
  checkout: createRateLimiter({
    keyPrefix: 'checkout',
    max: rateLimitCheckoutMax,
    message: 'Too many checkout attempts. Please try again later.',
    windowMs: rateLimitCheckoutWindowMs,
  }),
  passwordReset: createRateLimiter({
    keyPrefix: 'password-reset',
    max: rateLimitPasswordResetMax,
    message: 'Too many password reset attempts. Please try again later.',
    windowMs: rateLimitPasswordResetWindowMs,
  }),
  payment: createRateLimiter({
    keyPrefix: 'payment',
    max: rateLimitPaymentMax,
    message: 'Too many payment requests. Please try again later.',
    windowMs: rateLimitPaymentWindowMs,
  }),
  upload: createRateLimiter({
    keyPrefix: 'upload',
    max: rateLimitUploadMax,
    message: 'Too many upload requests. Please try again later.',
    windowMs: rateLimitUploadWindowMs,
  }),
  webhook: createRateLimiter({
    keyPrefix: 'webhook',
    max: rateLimitWebhookMax,
    message: 'Too many webhook requests. Please try again later.',
    windowMs: rateLimitWebhookWindowMs,
  }),
};

export { createRateLimiter, rateLimiters };

export default rateLimiters;
