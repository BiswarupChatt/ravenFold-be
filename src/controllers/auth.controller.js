const authService = require("../services/auth.service");
const successResponse = require("../utils/apiResponse");
const AppError = require("../utils/appError");

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return next(
        new AppError(
          "name, email and password are required",
          400,
          "VALIDATION_ERROR"
        )
      );
    }

    const user = await authService.registerUser({ name, email, password });

    return successResponse(res, "User registered successfully", user, 201);
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(
        new AppError("email and password are required", 400, "VALIDATION_ERROR")
      );
    }

    const user = await authService.loginUser({ email, password });

    return successResponse(res, "Login successful", user);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
};
