import { OAuth2Client } from 'google-auth-library';

import ApiError from '@/common/errors/api.error.js';
import { googleClientIds } from '@/config/env.config.js';

const googleClient = new OAuth2Client();
const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

const normalizeEmail = (email) => {
  return String(email || '').trim().toLowerCase();
};

const getName = (payload) => {
  return payload.name || [payload.given_name, payload.family_name].filter(Boolean).join(' ').trim();
};

const isEmailVerified = (value) => {
  return value === true || value === 'true';
};

const assertGoogleConfigured = () => {
  if (!googleClientIds.length) {
    throw new ApiError(500, 'Google auth is not configured. Set GOOGLE_CLIENT_ID or GOOGLE_CLIENT_IDS.');
  }
};

const assertGoogleAudience = (audience) => {
  if (!googleClientIds.includes(audience)) {
    throw new ApiError(401, 'Google token was issued for a different client');
  }
};

const fetchGoogleJson = async (url, options, fallbackMessage) => {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.error) {
    throw new ApiError(401, body.error_description || body.error || fallbackMessage);
  }

  return body;
};

const formatGoogleProfile = (payload) => {
  if (!payload?.sub || !payload.email || !isEmailVerified(payload.email_verified)) {
    throw new ApiError(401, 'Google account must include a verified email');
  }

  return {
    avatar: payload.picture || '',
    email: normalizeEmail(payload.email),
    emailVerified: isEmailVerified(payload.email_verified),
    name: getName(payload),
    provider: 'google',
    providerUserId: payload.sub,
  };
};

const verifyGoogleIdToken = async (idToken) => {
  if (!idToken) {
    throw new ApiError(400, 'Google ID token is required');
  }

  assertGoogleConfigured();

  try {
    const ticket = await googleClient.verifyIdToken({
      audience: googleClientIds,
      idToken,
    });
    const payload = ticket.getPayload();

    return formatGoogleProfile(payload);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(401, 'Invalid Google ID token');
  }
};

const verifyGoogleAccessToken = async (accessToken) => {
  if (!accessToken) {
    throw new ApiError(400, 'Google access token is required');
  }

  assertGoogleConfigured();

  const tokenInfoUrl = new URL(GOOGLE_TOKENINFO_URL);
  tokenInfoUrl.searchParams.set('access_token', accessToken);

  const tokenInfo = await fetchGoogleJson(tokenInfoUrl, undefined, 'Invalid Google access token');
  assertGoogleAudience(tokenInfo.aud);

  const profile = await fetchGoogleJson(
    GOOGLE_USERINFO_URL,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    'Unable to fetch Google profile',
  );

  return formatGoogleProfile(profile);
};

const verifyGoogleToken = async (tokenPayload = {}) => {
  if (typeof tokenPayload === 'string') {
    return verifyGoogleIdToken(tokenPayload);
  }

  if (tokenPayload.idToken) {
    return verifyGoogleIdToken(tokenPayload.idToken);
  }

  return verifyGoogleAccessToken(tokenPayload.accessToken);
};

export { verifyGoogleAccessToken, verifyGoogleIdToken, verifyGoogleToken };

export default {
  verifyGoogleAccessToken,
  verifyGoogleIdToken,
  verifyGoogleToken,
};
