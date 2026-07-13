import ApiError from '@/common/errors/api.error.js';
import {
  authLoginThrottleLockoutMs,
  authLoginThrottleMaxAttempts,
  authLoginThrottleWindowMs,
} from '@/config/env.config.js';
import LoginThrottle from '@/modules/auth/models/login-throttle.model.js';

const normalizeEmail = (email = '') => String(email || '').trim().toLowerCase();
const normalizeIpAddress = (ipAddress = '') => String(ipAddress || '').trim();

const buildLoginThrottleKey = ({ email = '', ipAddress = '' } = {}) => {
  const normalizedEmail = normalizeEmail(email) || 'unknown-email';
  const normalizedIpAddress = normalizeIpAddress(ipAddress) || 'unknown-ip';

  return `${normalizedEmail}|${normalizedIpAddress}`;
};

const buildLoginThrottleContext = ({ email = '', ipAddress = '' } = {}) => ({
  email: normalizeEmail(email),
  ipAddress: normalizeIpAddress(ipAddress),
  key: buildLoginThrottleKey({ email, ipAddress }),
});

const formatRetryAfterMinutes = (blockedUntil) => {
  const remainingMs = Math.max(new Date(blockedUntil).getTime() - Date.now(), 0);
  const remainingMinutes = Math.ceil(remainingMs / 60000);

  return Math.max(remainingMinutes, 1);
};

const assertLoginAllowed = async (context = {}) => {
  const throttleContext = buildLoginThrottleContext(context);
  const record = await LoginThrottle.findOne({ key: throttleContext.key }).exec();

  if (!record?.blockedUntil) {
    return null;
  }

  if (record.blockedUntil.getTime() <= Date.now()) {
    record.blockedUntil = null;
    record.failureCount = 0;
    record.firstFailureAt = null;
    await record.save();
    return null;
  }

  throw new ApiError(
    429,
    `Too many failed login attempts. Try again in ${formatRetryAfterMinutes(record.blockedUntil)} minute(s).`,
  );
};

const recordLoginFailure = async (context = {}) => {
  const throttleContext = buildLoginThrottleContext(context);
  const now = new Date();
  const windowStart = new Date(now.getTime() - authLoginThrottleWindowMs);
  let record = await LoginThrottle.findOne({ key: throttleContext.key }).exec();

  if (!record) {
    record = new LoginThrottle({
      email: throttleContext.email,
      failureCount: 1,
      firstFailureAt: now,
      ipAddress: throttleContext.ipAddress,
      key: throttleContext.key,
      lastAttemptAt: now,
    });
  } else {
    const blockedExpired = !record.blockedUntil || record.blockedUntil.getTime() <= now.getTime();
    const outsideWindow = !record.firstFailureAt || record.firstFailureAt.getTime() < windowStart.getTime();

    record.email = throttleContext.email;
    record.ipAddress = throttleContext.ipAddress;
    record.lastAttemptAt = now;

    if (outsideWindow || !blockedExpired) {
      if (!blockedExpired) {
        record.blockedUntil = null;
      }

      record.failureCount = 1;
      record.firstFailureAt = now;
    } else {
      record.failureCount += 1;
    }
  }

  if (record.failureCount >= authLoginThrottleMaxAttempts) {
    record.blockedUntil = new Date(now.getTime() + authLoginThrottleLockoutMs);
  }

  await record.save();
  return record;
};

const clearLoginThrottle = async (context = {}) => {
  const throttleContext = buildLoginThrottleContext(context);

  await LoginThrottle.deleteOne({ key: throttleContext.key }).exec();
};

export {
  assertLoginAllowed,
  buildLoginThrottleContext,
  buildLoginThrottleKey,
  clearLoginThrottle,
  recordLoginFailure,
};

export default {
  assertLoginAllowed,
  buildLoginThrottleContext,
  buildLoginThrottleKey,
  clearLoginThrottle,
  recordLoginFailure,
};
