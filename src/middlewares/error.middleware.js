const logger = require("../utils/logger");

const buildKnownError = (error) => {
  if (error.name === "ValidationError") {
    return {
      statusCode: 400,
      message: Object.values(error.errors)
        .map(({ message }) => message)
        .join(", "),
      code: "VALIDATION_ERROR",
    };
  }

  if (error.name === "CastError") {
    return {
      statusCode: 400,
      message: `Invalid ${error.path}`,
      code: "VALIDATION_ERROR",
    };
  }

  if (error.code === 11000) {
    const duplicateField = Object.keys(error.keyPattern || {})[0] || "resource";

    return {
      statusCode: 400,
      message: `${duplicateField} already exists`,
      code: "DUPLICATE_RESOURCE",
    };
  }

  return null;
};

const errorHandler = (error, req, res, next) => {
  const knownError = buildKnownError(error);
  const statusCode = knownError?.statusCode || error.statusCode || 500;
  const message =
    knownError?.message || error.message || "Internal server error";
  const code =
    knownError?.code || error.code || "INTERNAL_SERVER_ERROR";

  logger.error("Request failed", {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message: error.message,
  });

  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
    },
  });
};

module.exports = errorHandler;
