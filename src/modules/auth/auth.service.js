import authRepository from '@/modules/auth/auth.repository.js';
import ApiError from '@/common/errors/api.error.js';
import ROLES from '@/common/constants/roles.constant.js';
import { nodeEnv } from '@/config/env.config.js';
import { signToken } from '@/common/utils/jwt.util.js';
import { hashPassword, verifyPassword } from '@/common/utils/password.util.js';

const allowedRoles = Object.values(ROLES);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function assertValidEmail(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'A valid email is required');
  }
}

function assertValidPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters long');
  }
}

function getRegistrationRole(role) {
  if (!role || nodeEnv === 'production') {
    return ROLES.CUSTOMER;
  }

  if (!allowedRoles.includes(role)) {
    throw new ApiError(400, 'Invalid role');
  }

  return role;
}

function formatUser(user) {
  return {
    id: user.id || user._id?.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    roles: user.roles || [user.role],
  };
}

function createAuthResponse(user) {
  const formattedUser = formatUser(user);
  const token = signToken({
    sub: formattedUser.id,
    email: formattedUser.email,
    role: formattedUser.role,
    roles: formattedUser.roles,
  });

  return {
    token,
    user: formattedUser,
  };
}

function getStatus() {
  return {
    module: 'auth',
    repository: authRepository.name,
  };
}

async function register(payload) {
  const email = normalizeEmail(payload?.email);
  const password = payload?.password;
  const name = normalizeText(payload?.name);
  const phone = normalizeText(payload?.phone);
  const role = getRegistrationRole(payload?.role);

  assertValidEmail(email);
  assertValidPassword(password);

  const existingUser = await authRepository.findByEmail(email);

  if (existingUser) {
    throw new ApiError(409, 'Email is already registered');
  }

  const user = await authRepository.createUser({
    email,
    name,
    phone,
    passwordHash: await hashPassword(password),
    role,
    roles: [role],
  });

  return createAuthResponse(user);
}

async function login(payload) {
  const email = normalizeEmail(payload?.email);
  const password = payload?.password;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const user = await authRepository.findByEmail(email, { includePassword: true });
  const passwordMatches = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid email or password');
  }

  return createAuthResponse(user);
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

export { getAuthenticatedUser, getStatus, login, register, verifyOtp };

export default {
  getAuthenticatedUser,
  getStatus,
  login,
  register,
  verifyOtp,
};
