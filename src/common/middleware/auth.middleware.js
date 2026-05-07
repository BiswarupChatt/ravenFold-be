const ApiError = require('../errors/api.error');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authentication required'));
  }

  req.authToken = authHeader.slice('Bearer '.length);
  return next();
}

module.exports = authMiddleware;
