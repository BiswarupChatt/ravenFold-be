import mongoose from 'mongoose';

import ApiError from '@/common/errors/api.error.js';
import { getDisplayName, normalizeUserNameParts } from '@/common/utils/user-name.util.js';
import User from '@/modules/users/models/user.model.js';

const editableProfileFields = ['firstName', 'lastName', 'name', 'email', 'phone', 'avatar', 'gender', 'dob'];

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

const assertValidFirstName = (firstName) => {
  if (!normalizeText(firstName)) {
    throw new ApiError(400, 'First name is required');
  }
};

const formatUserProfile = (user) => {
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';

  return {
    id: user.id || user._id?.toString(),
    firstName,
    lastName,
    name: getDisplayName(user),
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

const buildProfileUpdate = (payload = {}, currentUser = {}) => {
  const update = editableProfileFields.reduce((profileUpdate, field) => {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) {
      return profileUpdate;
    }

    if (field === 'email') {
      const email = normalizeEmail(payload.email);

      assertValidEmail(email);
      profileUpdate.email = email;
      return profileUpdate;
    }

    profileUpdate[field] = normalizeText(payload[field]);
    return profileUpdate;
  }, {});

  if (
    Object.prototype.hasOwnProperty.call(update, 'firstName')
    || Object.prototype.hasOwnProperty.call(update, 'lastName')
    || Object.prototype.hasOwnProperty.call(update, 'name')
  ) {
    const normalizedName = normalizeUserNameParts({
      firstName: Object.prototype.hasOwnProperty.call(update, 'firstName')
        ? update.firstName
        : currentUser.firstName,
      lastName: Object.prototype.hasOwnProperty.call(update, 'lastName')
        ? update.lastName
        : currentUser.lastName,
      name: Object.prototype.hasOwnProperty.call(update, 'name')
        ? update.name
        : currentUser.name,
    });

    assertValidFirstName(normalizedName.firstName);

    update.firstName = normalizedName.firstName;
    update.lastName = normalizedName.lastName;
    update.name = normalizedName.name;
  }

  return update;
};

const updateCurrentUserProfile = async (authUser, payload) => {
  const user = await getAuthenticatedUserDocument(authUser);
  const update = buildProfileUpdate(payload, user);

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
