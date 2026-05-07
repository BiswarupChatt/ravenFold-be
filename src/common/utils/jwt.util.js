import jwt from 'jsonwebtoken';

import { jwtExpiresIn, jwtSecret, nodeEnv } from '@/config/env.config.js';

function getJwtSecret() {
  if (jwtSecret) {
    return jwtSecret;
  }

  if (nodeEnv !== 'production') {
    return 'ravenfold-development-jwt-secret';
  }

  throw new Error('JWT_SECRET is required in production');
}

function signToken(payload, options = {}) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: jwtExpiresIn,
    ...options,
  });
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

export { signToken, verifyToken };

export default {
  signToken,
  verifyToken,
};
