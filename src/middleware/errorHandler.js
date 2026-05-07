const { nodeEnv } = require('../config/env');

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    message: statusCode === 500 ? 'Internal server error' : error.message,
  };

  if (nodeEnv === 'development') {
    response.stack = error.stack;
  }

  return res.status(statusCode).json(response);
}

module.exports = errorHandler;
