import ApiError from '@/common/errors/api.error.js';

const assertShippingProviderConfigured = (condition, provider) => {
  if (!condition) {
    throw new ApiError(503, `${provider} shipping provider is not configured`);
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

const buildProviderErrorMessage = (payload) => {
  if (!payload) {
    return 'Shipping provider request failed';
  }

  if (payload.message) {
    return payload.message;
  }

  if (payload.error) {
    return typeof payload.error === 'string'
      ? payload.error
      : payload.error.message || payload.error.description || 'Shipping provider request failed';
  }

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    return payload.errors.join(', ');
  }

  return 'Shipping provider request failed';
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
    throw new ApiError(response.status, buildProviderErrorMessage(payload), payload);
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
    throw new ApiError(response.status, buildProviderErrorMessage(payload), payload);
  }

  return payload;
};

export {
  assertShippingProviderConfigured,
  buildProviderErrorMessage,
  getJson,
  postJson,
};

export default {
  assertShippingProviderConfigured,
  buildProviderErrorMessage,
  getJson,
  postJson,
};
