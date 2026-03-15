const User = require("../models/user.model");
const AppError = require("../utils/appError");
const { hashPassword, verifyPassword } = require("../utils/password");
const { toUserResponse } = require("../utils/userPayload");

const normalizeEmail = (email) => email.trim().toLowerCase();

const registerUser = async ({ name, email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new AppError("User already exists", 409, "USER_ALREADY_EXISTS");
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
  });

  return toUserResponse(user);
};

const loginUser = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail }).select(
    "+passwordHash"
  );

  if (!user) {
    throw new AppError(
      "Invalid email or password",
      401,
      "INVALID_CREDENTIALS"
    );
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError(
      "Invalid email or password",
      401,
      "INVALID_CREDENTIALS"
    );
  }

  return toUserResponse(user);
};

module.exports = {
  registerUser,
  loginUser,
};
