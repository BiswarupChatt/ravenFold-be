import { createHash, randomBytes } from 'node:crypto';

import logger from '@/common/logger/logger.js';
import { passwordResetTokenTtlMs } from '@/config/env.config.js';
import PasswordResetToken from '@/modules/auth/models/password-reset-token.model.js';

const hashResetToken = (token) => createHash('sha256').update(String(token || '')).digest('hex');

const createPasswordResetToken = async (user, context = {}) => {
  const rawToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + passwordResetTokenTtlMs);

  await PasswordResetToken.updateMany(
    {
      consumedAt: null,
      expiresAt: { $gt: new Date() },
      userId: user._id,
    },
    {
      $set: {
        consumedAt: new Date(),
      },
    },
  ).exec();

  await PasswordResetToken.create({
    consumedAt: null,
    expiresAt,
    requestedByIp: String(context.ipAddress || '').trim(),
    requestedUserAgent: String(context.userAgent || '').trim(),
    tokenHash: hashResetToken(rawToken),
    userId: user._id,
  });

  logger.info('Password reset token created', {
    email: user.email,
    expiresAt: expiresAt.toISOString(),
    userId: user._id.toString(),
  });

  return rawToken;
};

const findValidPasswordResetToken = async (token) => {
  return PasswordResetToken.findOne({
    consumedAt: null,
    expiresAt: { $gt: new Date() },
    tokenHash: hashResetToken(token),
  }).exec();
};

const consumePasswordResetToken = async (record) => {
  record.consumedAt = new Date();
  await record.save();
};

const invalidateUserPasswordResetTokens = async (userId) => {
  await PasswordResetToken.updateMany(
    {
      consumedAt: null,
      userId,
    },
    {
      $set: {
        consumedAt: new Date(),
      },
    },
  ).exec();
};

export {
  consumePasswordResetToken,
  createPasswordResetToken,
  findValidPasswordResetToken,
  hashResetToken,
  invalidateUserPasswordResetTokens,
};

export default {
  consumePasswordResetToken,
  createPasswordResetToken,
  findValidPasswordResetToken,
  hashResetToken,
  invalidateUserPasswordResetTokens,
};
