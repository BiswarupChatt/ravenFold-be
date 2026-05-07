import authRepository from '@/modules/auth/auth.repository.js';
import ApiError from '@/common/errors/api.error.js';
import ROLES from '@/common/constants/roles.constant.js';
import { nodeEnv } from '@/config/env.config.js';
import { signToken } from '@/common/utils/jwt.util.js';

function getStatus() {
  return {
    module: 'auth',
    repository: authRepository.name,
  };
}

async function login(payload) {
  const { email, password, role } = payload || {};

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const existingUser = await authRepository.findByEmail(email);
  const fallbackRole = nodeEnv === 'production' ? ROLES.CUSTOMER : role || ROLES.CUSTOMER;
  const user = existingUser || {
    id: 'development-user',
    email,
    role: fallbackRole,
    roles: [fallbackRole],
  };

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    roles: user.roles || [user.role],
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      roles: user.roles || [user.role],
    },
  };
}

async function verifyOtp(payload) {
  return {
    received: Boolean(payload),
    verified: false,
  };
}

function getAuthenticatedUser(user) {
  if (!user) {
    throw new ApiError(401, 'Authentication required');
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    roles: user.roles,
  };
}

export { getAuthenticatedUser, getStatus, login, verifyOtp };

export default {
  getAuthenticatedUser,
  getStatus,
  login,
  verifyOtp,
};
