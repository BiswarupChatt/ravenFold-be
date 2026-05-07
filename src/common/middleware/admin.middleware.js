import ApiError from '@/common/errors/api.error.js';
import ROLES from '@/common/constants/roles.constant.js';

function adminMiddleware(req, res, next) {
  const role = req.user && req.user.role;

  if (![ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role)) {
    return next(new ApiError(403, 'Admin access required'));
  }

  return next();
}

export default adminMiddleware;
