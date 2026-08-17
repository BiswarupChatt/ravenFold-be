import assert from 'node:assert/strict';
import test from 'node:test';

import { createRateLimiter } from '@/common/middleware/rateLimit.middleware.js';

const createMockResponse = () => {
  const headers = new Map();

  return {
    getHeader: (name) => headers.get(name),
    setHeader: (name, value) => {
      headers.set(name, value);
    },
  };
};

const runMiddleware = (middleware, req) => {
  const res = createMockResponse();
  let nextError = null;

  middleware(req, res, (error = null) => {
    nextError = error;
  });

  return { nextError, res };
};

test('createRateLimiter rejects requests after the configured limit', () => {
  const limiter = createRateLimiter({
    keyPrefix: `test-${Date.now()}`,
    max: 2,
    message: 'Too many test requests.',
    windowMs: 60000,
  });
  const req = {
    headers: {},
    ip: '203.0.113.10',
    socket: {},
  };

  assert.equal(runMiddleware(limiter, req).nextError, null);
  assert.equal(runMiddleware(limiter, req).nextError, null);

  const { nextError, res } = runMiddleware(limiter, req);

  assert.equal(nextError.statusCode, 429);
  assert.equal(nextError.message, 'Too many test requests.');
  assert.equal(res.getHeader('RateLimit-Limit'), '2');
  assert.equal(res.getHeader('RateLimit-Remaining'), '0');
  assert.ok(Number(res.getHeader('Retry-After')) > 0);
});
