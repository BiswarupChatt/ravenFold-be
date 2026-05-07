import express from 'express';

import adminRoutes from '@/modules/admin/admin.routes.js';
import ROLES from '@/common/constants/roles.constant.js';
import { authenticateUser, authorizeRoles } from '@/common/middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateUser, authorizeRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN), adminRoutes);

export default router;
