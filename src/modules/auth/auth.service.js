import mongoose from 'mongoose';

import ApiError from '@/common/errors/api.error.js';
import ROLES from '@/common/constants/roles.constant.js';
import User from '@/modules/users/user.model.js';
import { nodeEnv } from '@/config/env.config.js';
import { sendSuccess } from '@/common/helpers/response.helper.js';
import { signToken } from '@/common/utils/jwt.util.js';
import { hashPassword, verifyPassword } from '@/common/utils/password.util.js';

const allowedRoles = Object.values(ROLES);

const assertDatabaseReady = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new ApiError(503, 'Database connection is not ready. Check MONGO_URI and start MongoDB.');
  }
};

const normalizeEmail = (email) => {
  return String(email || '').trim().toLowerCase();
};

const normalizeText = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const assertValidEmail = (email) => {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'A valid email is required');
  }
};

const assertValidPassword = (password) => {
  if (typeof password !== 'string' || password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters long');
  }
};

const getRegistrationRole = (role) => {
  if (!role || nodeEnv === 'production') {
    return ROLES.CUSTOMER;
  }

  if (!allowedRoles.includes(role)) {
    throw new ApiError(400, 'Invalid role');
  }

  return role;
};

const formatUser = (user) => {
  return {
    id: user.id || user._id?.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    roles: user.roles || [user.role],
  };
};

const createAuthResponse = (user) => {
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
};

const createUser = async (userData) => {
  assertDatabaseReady();

  try {
    return await User.create(userData);
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'Email is already registered');
    }

    throw error;
  }
};

const findUserByEmail = async (email, options = {}) => {
  assertDatabaseReady();

  const query = User.findOne({ email: normalizeEmail(email) });

  if (options.includePassword) {
    query.select('+passwordHash');
  }

  return query.exec();
};

const getStatusData = () => {
  return {
    module: 'auth',
  };
};

const registerUser = async (payload) => {
  const email = normalizeEmail(payload?.email);
  const password = payload?.password;
  const name = normalizeText(payload?.name);
  const phone = normalizeText(payload?.phone);
  const role = getRegistrationRole(payload?.role);

  assertValidEmail(email);
  assertValidPassword(password);

  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw new ApiError(409, 'Email is already registered');
  }

  const user = await createUser({
    email,
    name,
    phone,
    passwordHash: await hashPassword(password),
    role,
    roles: [role],
  });

  return createAuthResponse(user);
};

const loginUser = async (payload) => {
  const email = normalizeEmail(payload?.email);
  const password = payload?.password;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const user = await findUserByEmail(email, { includePassword: true });
  const passwordMatches = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid email or password');
  }

  return createAuthResponse(user);
};

const verifyOtpPayload = async (payload) => {
  return {
    received: Boolean(payload),
    verified: false,
  };
};

const getAuthenticatedUser = (user) => {
  if (!user) {
    throw new ApiError(401, 'Authentication required');
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    roles: user.roles,
  };
};

const getStatus = async (req, res) => {
  return sendSuccess(res, getStatusData(), 'Auth module ready');
};

const register = async (req, res) => {
  return sendSuccess(res, await registerUser(req.body), 'Registration successful', 201);
};

const login = async (req, res) => {
  return sendSuccess(res, await loginUser(req.body), 'Login successful');
};

const verifyOtp = async (req, res) => {
  return sendSuccess(res, await verifyOtpPayload(req.body), 'OTP verification flow not implemented yet');
};

const getMe = async (req, res) => {
  return sendSuccess(res, getAuthenticatedUser(req.user), 'Authenticated user fetched');
};

export { getAuthenticatedUser, getMe, getStatus, login, loginUser, register, registerUser, verifyOtp, verifyOtpPayload };

export default {
  getAuthenticatedUser,
  getMe,
  getStatus,
  login,
  loginUser,
  register,
  registerUser,
  verifyOtp,
  verifyOtpPayload,
};
