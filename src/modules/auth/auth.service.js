import mongoose from 'mongoose';

import ApiError from '@/common/errors/api.error.js';
import ROLES from '@/common/constants/roles.constant.js';
import logger from '@/common/logger/logger.js';
import User from '@/modules/users/models/user.model.js';
import { nodeEnv } from '@/config/env.config.js';
import { sendSuccess } from '@/common/helpers/response.helper.js';
import { signToken } from '@/common/utils/jwt.util.js';
import { hashPassword, verifyPassword } from '@/common/utils/password.util.js';
import { sendPasswordResetEmail } from '@/infrastructure/email/email.service.js';
import { normalizeUserNameParts } from '@/common/utils/user-name.util.js';
import { verifyFacebookToken } from '@/modules/auth/providers/facebook.provider.js';
import { verifyGoogleToken } from '@/modules/auth/providers/google.provider.js';
import loginThrottleService from '@/modules/auth/services/login-throttle.service.js';
import passwordResetService from '@/modules/auth/services/password-reset.service.js';
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

const extractRequestContext = (req = {}) => {
  const forwardedFor = String(req.headers?.['x-forwarded-for'] || '').split(',')[0]?.trim();

  return {
    ipAddress: forwardedFor || req.ip || req.socket?.remoteAddress || '',
    userAgent: String(req.headers?.['user-agent'] || '').trim(),
  };
};

const assertValidEmail = (email) => {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'A valid email is required');
  }
};

const assertValidPassword = (password) => {
  const normalizedPassword = typeof password === 'string' ? password : '';

  if (normalizedPassword.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters long');
  }

  if (!/[a-z]/.test(normalizedPassword) || !/[A-Z]/.test(normalizedPassword) || !/\d/.test(normalizedPassword)) {
    throw new ApiError(400, 'Password must include uppercase, lowercase, and numeric characters');
  }
};

const assertValidFirstName = (firstName) => {
  if (!normalizeText(firstName)) {
    throw new ApiError(400, 'First name is required');
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

const findUserById = async (userId, options = {}) => {
  assertDatabaseReady();
  const query = User.findById(userId);

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

  if ((!user.firstName && !user.lastName && !user.name) && providerProfile.name) {
    const normalizedName = normalizeUserNameParts(providerProfile);

    user.firstName = normalizedName.firstName;
    user.lastName = normalizedName.lastName;
    user.name = normalizedName.name;
  }

  if (!user.avatar && providerProfile.avatar) {
    user.avatar = providerProfile.avatar;
  }

  return user.save();
};

const createProviderUser = async (providerProfile) => {
  const role = ROLES.CUSTOMER;
  const normalizedName = normalizeUserNameParts(providerProfile);

  return createUser({
    authProviders: [buildProviderAccount(providerProfile)],
    avatar: providerProfile.avatar || '',
    email: providerProfile.email,
    firstName: normalizedName.firstName,
    lastName: normalizedName.lastName,
    name: normalizedName.name,
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
  const normalizedName = normalizeUserNameParts({
    firstName: payload?.firstName,
    lastName: payload?.lastName,
    name: payload?.name,
  });
  const phone = normalizeText(payload?.phone);
  const role = getRegistrationRole(payload?.role);

  assertValidEmail(email);
  assertValidPassword(password);
  assertValidFirstName(normalizedName.firstName);

  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw new ApiError(409, 'Email is already registered');
  }

  const user = await createUser({
    email,
    firstName: normalizedName.firstName,
    lastName: normalizedName.lastName,
    name: normalizedName.name,
    phone,
    passwordHash: await hashPassword(password),
    role,
    roles: [role],
  });

  return createAuthResponse(user);
};

const loginUser = async (payload, requestContext = {}) => {
  const email = normalizeEmail(payload?.email);
  const password = payload?.password;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  await loginThrottleService.assertLoginAllowed({
    email,
    ipAddress: requestContext.ipAddress,
  });

  const user = await findUserByEmail(email, { includePassword: true });

  if (user?.isActive === false) {
    throw new ApiError(403, 'This account is inactive');
  }

  const passwordMatches = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!passwordMatches) {
    await loginThrottleService.recordLoginFailure({
      email,
      ipAddress: requestContext.ipAddress,
    });
    throw new ApiError(401, 'Invalid email or password');
  }

  await loginThrottleService.clearLoginThrottle({
    email,
    ipAddress: requestContext.ipAddress,
  });

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

const loginAdminUser = async (payload, requestContext = {}) => {
  return assertAdminAuthResponse(await loginUser(payload, requestContext));
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

const changePasswordForUser = async (actor, payload = {}) => {
  const authenticatedUser = getAuthenticatedUser(actor);
  const currentPassword = payload?.currentPassword;
  const newPassword = payload?.newPassword;
  const user = await findUserById(authenticatedUser.id, { includePassword: true });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (!user.passwordHash) {
    throw new ApiError(409, 'Password change is not available for this account');
  }

  if (!await verifyPassword(currentPassword, user.passwordHash)) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  assertValidPassword(newPassword);

  if (currentPassword === newPassword) {
    throw new ApiError(400, 'New password must be different from the current password');
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  await passwordResetService.invalidateUserPasswordResetTokens(user._id);

  return {
    success: true,
  };
};

const requestPasswordResetForEmail = async (payload = {}, requestContext = {}) => {
  const email = normalizeEmail(payload?.email);

  assertValidEmail(email);

  const user = await findUserByEmail(email, { includePassword: true });
  let resetToken = '';
  let delivery = 'skipped';

  if (user?.passwordHash && user.isActive !== false) {
    resetToken = await passwordResetService.createPasswordResetToken(user, requestContext);

    try {
      const result = await sendPasswordResetEmail({
        resetToken,
        user,
      });

      delivery = result.provider || result.status || 'sent';
    } catch (error) {
      delivery = 'failed';
      logger.error('Failed to send password reset email', {
        email,
        error: error?.message || error,
        userId: user._id.toString(),
      });
    }
  }

  return {
    delivery,
    message: 'If the account exists, password reset instructions will be sent.',
    ...(nodeEnv === 'production' || !resetToken ? {} : { resetToken }),
  };
};

const resetPasswordWithToken = async (payload = {}) => {
  const token = normalizeText(payload?.token);
  const newPassword = payload?.newPassword;

  if (!token) {
    throw new ApiError(400, 'Reset token is required');
  }

  assertValidPassword(newPassword);

  const resetRecord = await passwordResetService.findValidPasswordResetToken(token);

  if (!resetRecord) {
    throw new ApiError(400, 'Password reset token is invalid or expired');
  }

  const user = await findUserById(resetRecord.userId, { includePassword: true });

  if (!user || user.isActive === false) {
    throw new ApiError(404, 'User not found');
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  await passwordResetService.consumePasswordResetToken(resetRecord);
  await passwordResetService.invalidateUserPasswordResetTokens(user._id);

  return {
    success: true,
  };
};

const getStatus = async (req, res) => {
  return sendSuccess(res, getStatusData(), 'Auth module ready');
};

const register = async (req, res) => {
  return sendSuccess(res, await registerUser(req.body), 'Registration successful', 201);
};

const login = async (req, res) => {
  return sendSuccess(res, await loginUser(req.body, extractRequestContext(req)), 'Login successful');
};

const loginAdmin = async (req, res) => {
  return sendSuccess(res, await loginAdminUser(req.body, extractRequestContext(req)), 'Admin login successful');
};

const requestPasswordReset = async (req, res) => {
  return sendSuccess(
    res,
    await requestPasswordResetForEmail(req.body, extractRequestContext(req)),
    'Password reset request accepted',
  );
};

const resetPassword = async (req, res) => {
  return sendSuccess(res, await resetPasswordWithToken(req.body), 'Password reset successful');
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

const changePassword = async (req, res) => {
  return sendSuccess(res, await changePasswordForUser(req.user, req.body), 'Password updated successfully');
};

export {
  authenticateProviderUser,
  changePassword,
  changePasswordForUser,
  facebookAuth,
  getAuthenticatedUser,
  getMe,
  getStatus,
  googleAuth,
  login,
  loginAdmin,
  loginAdminUser,
  loginUser,
  requestPasswordReset,
  requestPasswordResetForEmail,
  register,
  registerUser,
  resetPassword,
  resetPasswordWithToken,
  verifyOtp,
  verifyOtpPayload,
};

export default {
  authenticateProviderUser,
  changePassword,
  facebookAuth,
  getAuthenticatedUser,
  getMe,
  getStatus,
  googleAuth,
  login,
  loginAdmin,
  loginAdminUser,
  loginUser,
  requestPasswordReset,
  register,
  registerUser,
  resetPassword,
  verifyOtp,
  verifyOtpPayload,
};
