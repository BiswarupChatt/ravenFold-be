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
    throw new Error('Admin password must be at least 8 characters long.');
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    throw new Error('Admin password must include uppercase, lowercase, and numeric characters.');
  }
};

const upsertAdminUser = async () => {
  const email = normalizeEmail(getArgValue('email') || process.env.ADMIN_SEED_EMAIL);
  const password = getArgValue('password') || process.env.ADMIN_SEED_PASSWORD;
  const name = getArgValue('name') || process.env.ADMIN_SEED_NAME || 'Raven Fold Admin';
  const role = getArgValue('role') || process.env.ADMIN_SEED_ROLE || ROLES.SUPER_ADMIN;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Provide a valid admin email with --email= or ADMIN_SEED_EMAIL.');
  }

  assertValidPassword(password);

  if (![ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role)) {
    throw new Error(`Admin role must be "${ROLES.ADMIN}" or "${ROLES.SUPER_ADMIN}".`);
  }

  await connectMongoDB();

  const existingUser = await User.findOne({ email }).select('+passwordHash').exec();
  const roles = Array.from(new Set([...(existingUser?.roles || []), role, ROLES.ADMIN]));
  const user = existingUser || new User({ email });

  user.name = user.name || name;
  user.firstName = user.firstName || name.split(' ')[0] || 'Raven';
  user.lastName = user.lastName || name.split(' ').slice(1).join(' ');
  user.passwordHash = await hashPassword(password);
  user.role = role;
  user.roles = roles;
  user.isActive = true;

  await user.save();

  logger.info(`${existingUser ? 'Updated' : 'Created'} admin user`, {
    email,
    role: user.role,
    roles: user.roles,
  });
};

upsertAdminUser()
  .catch((error) => {
    logger.error('Failed to upsert admin user', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectMongoDB();
  });
