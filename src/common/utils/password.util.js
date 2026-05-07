import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const HASH_PREFIX = 'scrypt';
const KEY_LENGTH = 64;

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, KEY_LENGTH);

  return `${HASH_PREFIX}$${salt}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  if (!password || !storedHash) {
    return false;
  }

  const [prefix, salt, key] = storedHash.split('$');

  if (prefix !== HASH_PREFIX || !salt || !key || !/^[a-f0-9]+$/i.test(key)) {
    return false;
  }

  const storedKey = Buffer.from(key, 'hex');

  if (storedKey.length === 0) {
    return false;
  }

  const derivedKey = await scrypt(password, salt, storedKey.length);

  return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
}

export { hashPassword, verifyPassword };

export default {
  hashPassword,
  verifyPassword,
};
