import AppError from '@/common/errors/app.error.js';

class ApiError extends AppError {
  constructor(statusCode, message, details = null) {
    super(message, statusCode, details);
  }
}

export default ApiError;
