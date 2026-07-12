import mongoose from 'mongoose';

import ApiError from '@/common/errors/api.error.js';
import ROLES from '@/common/constants/roles.constant.js';
import User from '@/modules/users/models/user.model.js';
import { nodeEnv } from '@/config/env.config.js';
import { sendSuccess } from '@/common/helpers/response.helper.js';
import { signToken } from '@/common/utils/jwt.util.js';
import { hashPassword, verifyPassword } from '@/common/utils/password.util.js';
import { verifyFacebookToken } from '@/modules/auth/providers/facebook.provider.js';
import { verifyGoogleToken } from '@/modules/auth/providers/google.provider.js';
import { formatUserProfile, getCurrentUserProfile } from '@/modules/users/services/user.service.js';

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

const formatUser = formatUserProfile;

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

const findUserByProvider = async (provider, providerUserId) => {
  assertDatabaseReady();

  return User.findOne({
    authProviders: {
      $elemMatch: {
        provider,
        providerUserId,
      },
    },
  }).exec();
};

const buildProviderAccount = (providerProfile) => {
  return {
    avatar: providerProfile.avatar || '',
    email: providerProfile.email || '',
    linkedAt: new Date(),
    name: providerProfile.name || '',
    provider: providerProfile.provider,
    providerUserId: providerProfile.providerUserId,
  };
};

const hasProviderAccount = (user, providerProfile) => {
  return Boolean(
    user.authProviders?.some((account) => {
      return account.provider === providerProfile.provider && account.providerUserId === providerProfile.providerUserId;
    }),
  );
};

const linkProviderAccount = async (user, providerProfile) => {
  if (!hasProviderAccount(user, providerProfile)) {
    user.authProviders = [...(user.authProviders || []), buildProviderAccount(providerProfile)];
  }

  if (!user.name && providerProfile.name) {
    user.name = providerProfile.name;
  }

  if (!user.avatar && providerProfile.avatar) {
    user.avatar = providerProfile.avatar;
  }

  return user.save();
};

const createProviderUser = async (providerProfile) => {
  const role = ROLES.CUSTOMER;

  return createUser({
    authProviders: [buildProviderAccount(providerProfile)],
    avatar: providerProfile.avatar || '',
    email: providerProfile.email,
    name: providerProfile.name || '',
    role,
    roles: [role],
  });
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

const assertAdminAuthResponse = (authResponse) => {
  const roles = Array.isArray(authResponse?.user?.roles)
    ? authResponse.user.roles
    : [authResponse?.user?.role].filter(Boolean);

  if (!roles.includes(ROLES.ADMIN) && !roles.includes(ROLES.SUPER_ADMIN)) {
    throw new ApiError(403, 'Admin access required');
  }
  
  return authResponse;
};

const loginAdminUser = async (payload) => {
  return assertAdminAuthResponse(await loginUser(payload));
};

const verifyOtpPayload = async (payload) => {
  throw new ApiError(501, 'OTP verification is not enabled in this backend');
};

const getGoogleAuthToken = (payload) => {
  return {
    accessToken: payload?.accessToken || payload?.token,
    idToken: payload?.idToken || payload?.credential,
  };
};

const getFacebookAccessToken = (payload) => {
  return payload?.accessToken || payload?.token;
};

const authenticateProviderUser = async (providerProfile) => {
  if (!providerProfile?.email || !providerProfile.emailVerified) {
    throw new ApiError(401, 'Provider account must include a verified email');
  }

  const providerUser = await findUserByProvider(providerProfile.provider, providerProfile.providerUserId);

  if (providerUser) {
    return {
      ...createAuthResponse(providerUser),
      isNewUser: false,
    };
  }

  const emailUser = await findUserByEmail(providerProfile.email);

  if (emailUser) {
    const linkedUser = await linkProviderAccount(emailUser, providerProfile);

    return {
      ...createAuthResponse(linkedUser),
      isNewUser: false,
    };
  }

  const user = await createProviderUser(providerProfile);

  return {
    ...createAuthResponse(user),
    isNewUser: true,
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

const loginAdmin = async (req, res) => {
  return sendSuccess(res, await loginAdminUser(req.body), 'Admin login successful');
};

const verifyOtp = async (req, res) => {
  return sendSuccess(res, await verifyOtpPayload(req.body), 'OTP verification unavailable');
};

const googleAuth = async (req, res) => {
  const providerProfile = await verifyGoogleToken(getGoogleAuthToken(req.body));

  return sendSuccess(res, await authenticateProviderUser(providerProfile), 'Google authentication successful');
};

const facebookAuth = async (req, res) => {
  const providerProfile = await verifyFacebookToken(getFacebookAccessToken(req.body));

  return sendSuccess(res, await authenticateProviderUser(providerProfile), 'Facebook authentication successful');
};

const getMe = async (req, res) => {
  return sendSuccess(res, await getCurrentUserProfile(req.user), 'Authenticated user fetched');
};

export {
  authenticateProviderUser,
  facebookAuth,
  getAuthenticatedUser,
  getMe,
  getStatus,
  googleAuth,
  login,
  loginAdmin,
  loginAdminUser,
  loginUser,
  register,
  registerUser,
  verifyOtp,
  verifyOtpPayload,
};

export default {
  authenticateProviderUser,
  facebookAuth,
  getAuthenticatedUser,
  getMe,
  getStatus,
  googleAuth,
  login,
  loginAdmin,
  loginAdminUser,
  loginUser,
  register,
  registerUser,
  verifyOtp,
  verifyOtpPayload,
};
