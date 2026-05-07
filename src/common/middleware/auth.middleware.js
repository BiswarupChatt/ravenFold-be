import ApiError from '@/common/errors/api.error.js';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authentication required'));
  }

  req.authToken = authHeader.slice('Bearer '.length);
  return next();
}

export default authMiddleware;
