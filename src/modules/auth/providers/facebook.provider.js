import ApiError from '@/common/errors/api.error.js';
import { facebookAppId, facebookAppSecret, facebookGraphVersion } from '@/config/env.config.js';

const normalizeEmail = (email) => {
  return String(email || '').trim().toLowerCase();
};

const graphUrl = (path, params = {}) => {
  const versionPath = facebookGraphVersion ? `/${facebookGraphVersion}` : '';
  const url = new URL(`https://graph.facebook.com${versionPath}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  return url;
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.error) {
    throw new ApiError(401, body.error?.message || 'Facebook token verification failed');
  }

  return body;
};

const verifyFacebookToken = async (accessToken) => {
  if (!accessToken) {
    throw new ApiError(400, 'Facebook access token is required');
  }

  if (!facebookAppId || !facebookAppSecret) {
    throw new ApiError(500, 'Facebook auth is not configured. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.');
  }

  const appAccessToken = `${facebookAppId}|${facebookAppSecret}`;
  const debugResponse = await fetchJson(
    graphUrl('/debug_token', {
      access_token: appAccessToken,
      input_token: accessToken,
    }),
  );
  const tokenData = debugResponse.data;

  if (!tokenData?.is_valid || tokenData.app_id !== facebookAppId || !tokenData.user_id) {
    throw new ApiError(401, 'Invalid Facebook access token');
  }

  const profile = await fetchJson(
    graphUrl('/me', {
      access_token: accessToken,
      fields: 'id,name,email,picture.type(large)',
    }),
  );

  if (profile.id !== tokenData.user_id || !profile.email) {
    throw new ApiError(401, 'Facebook account email permission is required');
  }

  return {
    avatar: profile.picture?.data?.url || '',
    email: normalizeEmail(profile.email),
    emailVerified: Boolean(profile.email),
    name: profile.name || '',
    provider: 'facebook',
    providerUserId: profile.id,
  };
};

export { verifyFacebookToken };

export default {
  verifyFacebookToken,
};
