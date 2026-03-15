const crypto = require("crypto");

const KEY_LENGTH = 64;

const hashPassword = async (password) => {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");

    crypto.scrypt(password, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
};

const verifyPassword = async (password, storedHash) => {
  return new Promise((resolve, reject) => {
    const [salt, hashedValue] = String(storedHash).split(":");

    if (!salt || !hashedValue) {
      resolve(false);
      return;
    }

    crypto.scrypt(password, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      const storedBuffer = Buffer.from(hashedValue, "hex");

      if (storedBuffer.length !== derivedKey.length) {
        resolve(false);
        return;
      }

      resolve(crypto.timingSafeEqual(storedBuffer, derivedKey));
    });
  });
};

module.exports = {
  hashPassword,
  verifyPassword,
};
