const ApiError = require('../errors/api.error');
const ROLES = require('../constants/roles.constant');

function adminMiddleware(req, res, next) {
  const role = req.user && req.user.role;

  if (![ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role)) {
    return next(new ApiError(403, 'Admin access required'));
  }

  return next();
}

module.exports = adminMiddleware;
