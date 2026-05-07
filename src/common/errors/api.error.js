const AppError = require('./app.error');

class ApiError extends AppError {
  constructor(statusCode, message, details = null) {
    super(message, statusCode, details);
  }
}

module.exports = ApiError;
