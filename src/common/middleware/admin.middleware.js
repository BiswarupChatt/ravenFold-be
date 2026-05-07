import ROLES from '@/common/constants/roles.constant.js';
import { authorizeRoles } from '@/common/middleware/auth.middleware.js';

const adminMiddleware = authorizeRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN);

export default adminMiddleware;
