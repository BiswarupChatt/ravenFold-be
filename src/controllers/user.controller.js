const userService = require("../services/user.service");
const successResponse = require("../utils/apiResponse");

const getUsers = async (req, res, next) => {
  try {
    const users = await userService.listUsers();

    return successResponse(res, "Users fetched successfully", users);
  } catch (error) {
    return next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);

    return successResponse(res, "User fetched successfully", user);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
};
