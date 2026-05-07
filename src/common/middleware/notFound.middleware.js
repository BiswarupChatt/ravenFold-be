const ApiError = require('../errors/api.error');

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
}

module.exports = notFound;
