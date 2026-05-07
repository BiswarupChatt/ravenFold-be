import mongoose from 'mongoose';

import ApiError from '@/common/errors/api.error.js';
import User from '@/modules/users/user.model.js';

function assertDatabaseReady() {
  if (mongoose.connection.readyState !== 1) {
    throw new ApiError(503, 'Database connection is not ready. Check MONGO_URI and start MongoDB.');
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function createUser(userData) {
  assertDatabaseReady();

  try {
    return await User.create(userData);
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'Email is already registered');
    }

    throw error;
  }
}

async function findByEmail(email, options = {}) {
  assertDatabaseReady();

  const query = User.findOne({ email: normalizeEmail(email) });

  if (options.includePassword) {
    query.select('+passwordHash');
  }

  return query.exec();
}

export { createUser, findByEmail };

export default {
  createUser,
  findByEmail,
  name: 'auth.repository',
};
