import { OAuth2Client } from 'google-auth-library';

import ApiError from '@/common/errors/api.error.js';
import { googleClientIds } from '@/config/env.config.js';

const googleClient = new OAuth2Client();

const normalizeEmail = (email) => {
  return String(email || '').trim().toLowerCase();
};

const getName = (payload) => {
  return payload.name || [payload.given_name, payload.family_name].filter(Boolean).join(' ').trim();
};

const verifyGoogleToken = async (idToken) => {
  if (!idToken) {
    throw new ApiError(400, 'Google ID token is required');
  }

  if (!googleClientIds.length) {
    throw new ApiError(500, 'Google auth is not configured. Set GOOGLE_CLIENT_ID or GOOGLE_CLIENT_IDS.');
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      audience: googleClientIds,
      idToken,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || !payload.email_verified) {
      throw new ApiError(401, 'Google account must include a verified email');
    }

    return {
      avatar: payload.picture || '',
      email: normalizeEmail(payload.email),
      emailVerified: Boolean(payload.email_verified),
      name: getName(payload),
      provider: 'google',
      providerUserId: payload.sub,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(401, 'Invalid Google ID token');
  }
};

export { verifyGoogleToken };

export default {
  verifyGoogleToken,
};
