import ApiError from '@/common/errors/api.error.js';
import { verifyToken } from '@/common/utils/jwt.util.js';

function getBearerToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length);
}

function normalizeUserFromToken(decodedToken) {
  const roles = Array.isArray(decodedToken.roles)
    ? decodedToken.roles
    : [decodedToken.role].filter(Boolean);

  return {
    id: decodedToken.sub || decodedToken.id || decodedToken.userId,
    email: decodedToken.email,
    role: decodedToken.role || roles[0],
    roles,
    tokenPayload: decodedToken,
  };
}

function authenticateUser(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    return next(new ApiError(401, 'Authentication required'));
  }

  try {
    req.authToken = token;
    req.user = normalizeUserFromToken(verifyToken(token));
    return next();
  } catch (error) {
    const message = error.name === 'TokenExpiredError' ? 'Authentication token expired' : 'Invalid authentication token';
    return next(new ApiError(401, message));
  }
}

function authorizeRoles(...allowedRoles) {
  const roleList = allowedRoles.flat().filter(Boolean);

  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    const userRoles = req.user.roles && req.user.roles.length ? req.user.roles : [req.user.role].filter(Boolean);
    const hasAllowedRole = userRoles.some((role) => roleList.includes(role));

    if (!hasAllowedRole) {
      return next(new ApiError(403, 'You do not have permission to access this resource'));
    }

    return next();
  };
}

const authorizeUser = authorizeRoles;

export { authenticateUser, authorizeRoles, authorizeUser };

export default authenticateUser;
