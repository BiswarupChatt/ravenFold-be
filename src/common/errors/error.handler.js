import { nodeEnv } from '@/config/env.config.js';

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    message: statusCode === 500 ? 'Internal server error' : error.message,
  };

  if (error.details) {
    response.details = error.details;
  }

  if (nodeEnv === 'development') {
    response.stack = error.stack;
  }

  return res.status(statusCode).json(response);
}

export default errorHandler;
