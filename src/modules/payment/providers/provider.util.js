import crypto from 'node:crypto';

import ApiError from '@/common/errors/api.error.js';

const encodeBasicAuth = (username, password = '') => Buffer
  .from(`${username}:${password}`)
  .toString('base64');

const assertProviderConfigured = (condition, provider) => {
  if (!condition) {
    throw new ApiError(503, `${provider} payment provider is not configured`);
  }
};

const safeJson = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const postJson = async (url, body, { headers = {} } = {}) => {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    method: 'POST',
  });
  const payload = await safeJson(response);

  if (!response.ok) {
    throw new ApiError(response.status, payload?.error?.description || payload?.message || 'Payment provider request failed', payload);
  }

  return payload;
};

const getJson = async (url, { headers = {} } = {}) => {
  const response = await fetch(url, {
    headers,
    method: 'GET',
  });
  const payload = await safeJson(response);

  if (!response.ok) {
    throw new ApiError(response.status, payload?.error?.description || payload?.message || 'Payment provider request failed', payload);
  }

  return payload;
};

const hmacSha256 = (value, secret) => crypto
  .createHmac('sha256', secret)
  .update(value)
  .digest('hex');

const timingSafeEqual = (left = '', right = '') => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export {
  assertProviderConfigured,
  encodeBasicAuth,
  getJson,
  hmacSha256,
  postJson,
  timingSafeEqual,
};
