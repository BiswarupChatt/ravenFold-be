const mongoose = require("mongoose");

const User = require("../models/user.model");
const AppError = require("../utils/appError");
const { toUserResponse } = require("../utils/userPayload");

const listUsers = async () => {
  const users = await User.find().sort({ createdAt: -1 });

  return users.map(toUserResponse);
};

const getUserById = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError("Invalid user id", 400, "VALIDATION_ERROR");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  return toUserResponse(user);
};

module.exports = {
  listUsers,
  getUserById,
};
