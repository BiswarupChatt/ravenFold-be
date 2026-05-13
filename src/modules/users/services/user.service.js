import mongoose from 'mongoose';

import ApiError from '@/common/errors/api.error.js';
import User from '@/modules/users/models/user.model.js';

const editableProfileFields = ['name', 'email', 'phone', 'avatar', 'gender', 'dob'];

const assertDatabaseReady = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new ApiError(503, 'Database connection is not ready. Check MONGO_URI and start MongoDB.');
  }
};

const getStatusData = () => {
  return {
    module: 'users',
  };
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

const formatUserProfile = (user) => {
  return {
    id: user.id || user._id?.toString(),
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    avatar: user.avatar || '',
    gender: user.gender || '',
    dob: user.dob || '',
    role: user.role,
    roles: user.roles || [user.role],
    authProviders: user.authProviders?.map((account) => account.provider) || [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const getAuthenticatedUserDocument = async (authUser) => {
  assertDatabaseReady();

  if (!authUser?.id) {
    throw new ApiError(401, 'Authentication required');
  }

  const user = await User.findById(authUser.id).exec();

  if (!user || user.isActive === false) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

const getCurrentUserProfile = async (authUser) => {
  const user = await getAuthenticatedUserDocument(authUser);

  return formatUserProfile(user);
};

const buildProfileUpdate = (payload = {}) => {
  return editableProfileFields.reduce((update, field) => {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) {
      return update;
    }

    if (field === 'email') {
      const email = normalizeEmail(payload.email);

      assertValidEmail(email);
      update.email = email;
      return update;
    }

    update[field] = normalizeText(payload[field]);
    return update;
  }, {});
};

const updateCurrentUserProfile = async (authUser, payload) => {
  const user = await getAuthenticatedUserDocument(authUser);
  const update = buildProfileUpdate(payload);

  Object.assign(user, update);

  try {
    await user.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'Email is already registered');
    }

    throw error;
  }

  return formatUserProfile(user);
};

export {
  formatUserProfile,
  getCurrentUserProfile,
  getStatusData,
  updateCurrentUserProfile,
};

export default {
  formatUserProfile,
  getCurrentUserProfile,
  getStatusData,
  updateCurrentUserProfile,
};
