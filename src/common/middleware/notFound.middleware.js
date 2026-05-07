import ApiError from '@/common/errors/api.error.js';

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export default notFound;
