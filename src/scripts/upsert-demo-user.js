import ROLES from '@/common/constants/roles.constant.js';
import logger from '@/common/logger/logger.js';
import { hashPassword } from '@/common/utils/password.util.js';
import { connectMongoDB, disconnectMongoDB } from '@/infrastructure/database/mongodb.js';
import User from '@/modules/users/models/user.model.js';

const getArgValue = (name) => {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));

  return match ? match.slice(prefix.length).trim() : '';
};

const normalizeEmail = (email = '') => String(email || '').trim().toLowerCase();

const assertValidPassword = (password = '') => {
  if (password.length < 8) {
    throw new Error('Demo user password must be at least 8 characters long.');
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    throw new Error('Demo user password must include uppercase, lowercase, and numeric characters.');
  }
};

const upsertDemoUser = async () => {
  const email = normalizeEmail(getArgValue('email') || process.env.DEMO_USER_EMAIL);
  const password = getArgValue('password') || process.env.DEMO_USER_PASSWORD;
  const firstName = getArgValue('firstName') || process.env.DEMO_USER_FIRST_NAME || 'Demo';
  const lastName = getArgValue('lastName') || process.env.DEMO_USER_LAST_NAME || 'Customer';
  const phone = getArgValue('phone') || process.env.DEMO_USER_PHONE || '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Provide a valid demo user email with --email= or DEMO_USER_EMAIL.');
  }

  assertValidPassword(password);

  await connectMongoDB();

  const existingUser = await User.findOne({ email }).select('+passwordHash').exec();
  const user = existingUser || new User({ email });

  user.firstName = firstName;
  user.lastName = lastName;
  user.name = `${firstName} ${lastName}`.trim();
  user.phone = phone;
  user.passwordHash = await hashPassword(password);
  user.role = ROLES.CUSTOMER;
  user.roles = [ROLES.CUSTOMER];
  user.isActive = true;

  await user.save();

  logger.info(`${existingUser ? 'Updated' : 'Created'} demo user`, {
    email,
    role: user.role,
    roles: user.roles,
  });
};

upsertDemoUser()
  .catch((error) => {
    logger.error('Failed to upsert demo user', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectMongoDB();
  });
