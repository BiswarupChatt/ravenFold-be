import crypto from 'node:crypto';

import ApiError from '@/common/errors/api.error.js';
import ROLES from '@/common/constants/roles.constant.js';
import { jwtSecret, nodeEnv } from '@/config/env.config.js';
import User from '@/modules/users/models/user.model.js';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_DIGITS = 6;
const TOTP_PERIOD_SECONDS = 30;
const TOTP_WINDOW = 1;

const normalizeText = (value) => String(value || '').trim();
const normalizeMfaCode = (value) => normalizeText(value).replace(/\s/g, '');

const getEncryptionKey = () => crypto
  .createHash('sha256')
  .update(jwtSecret || (nodeEnv === 'production' ? '' : 'ravenfold-development-jwt-secret'))
  .digest();

const assertEncryptionReady = () => {
  if (!jwtSecret && nodeEnv === 'production') {
    throw new ApiError(500, 'JWT_SECRET is required before admin MFA can be used');
  }
};

const encryptSecret = (secret) => {
  assertEncryptionReady();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
};

const decryptSecret = (payload) => {
  assertEncryptionReady();
  const [ivValue, tagValue, encryptedValue] = normalizeText(payload).split('.');

  if (!ivValue || !tagValue || !encryptedValue) {
    throw new ApiError(500, 'Admin MFA secret is invalid');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivValue, 'base64url'),
  );

  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
};

const encodeBase32 = (buffer) => {
  let bits = '';
  let output = '';

  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }

  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, '0');

    output += BASE32_ALPHABET[parseInt(chunk, 2)];
  }

  return output;
};

const decodeBase32 = (secret) => {
  const normalizedSecret = normalizeText(secret).replace(/=+$/g, '').replace(/\s/g, '').toUpperCase();
  let bits = '';

  for (const char of normalizedSecret) {
    const value = BASE32_ALPHABET.indexOf(char);

    if (value === -1) {
      throw new ApiError(500, 'Admin MFA secret contains invalid characters');
    }

    bits += value.toString(2).padStart(5, '0');
  }

  const bytes = [];

  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
};

const generateSecret = () => encodeBase32(crypto.randomBytes(20));

const generateTotp = (secret, counter) => {
  const counterBuffer = Buffer.alloc(8);

  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', decodeBase32(secret)).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary = (
    ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff)
  );

  return String(binary % (10 ** TOTP_DIGITS)).padStart(TOTP_DIGITS, '0');
};

const verifyTotp = ({ code, secret }) => {
  const normalizedCode = normalizeMfaCode(code);

  if (!/^\d{6}$/.test(normalizedCode)) {
    return false;
  }

  const currentCounter = Math.floor(Date.now() / 1000 / TOTP_PERIOD_SECONDS);

  for (let offset = -TOTP_WINDOW; offset <= TOTP_WINDOW; offset += 1) {
    const expectedCode = generateTotp(secret, currentCounter + offset);

    if (crypto.timingSafeEqual(Buffer.from(expectedCode), Buffer.from(normalizedCode))) {
      return true;
    }
  }

  return false;
};

const getUserRoles = (user = {}) => (
  Array.isArray(user.roles) && user.roles.length ? user.roles : [user.role].filter(Boolean)
);

const assertAdminUser = (user) => {
  if (!user || user.isActive === false) {
    throw new ApiError(404, 'User not found');
  }

  const roles = getUserRoles(user);

  if (!roles.includes(ROLES.ADMIN) && !roles.includes(ROLES.SUPER_ADMIN)) {
    throw new ApiError(403, 'Admin access required');
  }
};

const getAuthenticatedAdmin = async (actor = {}) => {
  const user = await User.findById(actor.id).exec();

  assertAdminUser(user);

  return user;
};

const getAdminMfaStatus = async (actor) => {
  const user = await getAuthenticatedAdmin(actor);

  return {
    enabled: Boolean(user.adminMfa?.enabled),
    pendingSetup: Boolean(user.adminMfa?.pendingSecretEncrypted),
  };
};

const createAdminMfaSetup = async (actor) => {
  const user = await getAuthenticatedAdmin(actor);
  const secret = generateSecret();
  const issuer = 'Raven Fold Admin';
  const accountName = user.email || user._id.toString();

  user.adminMfa = {
    ...(user.adminMfa || {}),
    pendingSecretEncrypted: encryptSecret(secret),
  };
  await user.save();

  return {
    enabled: Boolean(user.adminMfa?.enabled),
    manualEntryKey: secret,
    otpauthUrl: `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`,
  };
};

const enableAdminMfa = async (actor, payload = {}) => {
  const user = await getAuthenticatedAdmin(actor);
  const pendingSecretEncrypted = user.adminMfa?.pendingSecretEncrypted;

  if (!pendingSecretEncrypted) {
    throw new ApiError(409, 'Start admin MFA setup before enabling it');
  }

  const secret = decryptSecret(pendingSecretEncrypted);

  if (!verifyTotp({ code: payload.code, secret })) {
    throw new ApiError(401, 'Invalid MFA code');
  }

  user.adminMfa = {
    enabled: true,
    enabledAt: user.adminMfa?.enabledAt || new Date(),
    lastVerifiedAt: new Date(),
    pendingSecretEncrypted: '',
    secretEncrypted: pendingSecretEncrypted,
  };
  await user.save();

  return {
    enabled: true,
  };
};

const disableAdminMfa = async (actor, payload = {}) => {
  const user = await getAuthenticatedAdmin(actor);
  const secretEncrypted = user.adminMfa?.secretEncrypted;

  if (!user.adminMfa?.enabled || !secretEncrypted) {
    return {
      enabled: false,
    };
  }

  const secret = decryptSecret(secretEncrypted);

  if (!verifyTotp({ code: payload.code, secret })) {
    throw new ApiError(401, 'Invalid MFA code');
  }

  user.adminMfa = {
    enabled: false,
    enabledAt: null,
    lastVerifiedAt: null,
    pendingSecretEncrypted: '',
    secretEncrypted: '',
  };
  await user.save();

  return {
    enabled: false,
  };
};

const verifyAdminLoginMfa = async ({ code, user }) => {
  if (!user.adminMfa?.enabled) {
    return;
  }

  if (!normalizeMfaCode(code)) {
    throw new ApiError(428, 'Admin MFA code required', { mfaRequired: true });
  }

  const secret = decryptSecret(user.adminMfa.secretEncrypted);

  if (!verifyTotp({ code, secret })) {
    throw new ApiError(401, 'Invalid MFA code', { mfaRequired: true });
  }

  user.adminMfa.lastVerifiedAt = new Date();
  await user.save();
};

export {
  createAdminMfaSetup,
  disableAdminMfa,
  enableAdminMfa,
  getAdminMfaStatus,
  verifyAdminLoginMfa,
  verifyTotp,
};

export default {
  createAdminMfaSetup,
  disableAdminMfa,
  enableAdminMfa,
  getAdminMfaStatus,
  verifyAdminLoginMfa,
  verifyTotp,
};
