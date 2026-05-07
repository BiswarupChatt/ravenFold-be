import express from 'express';

import adminService from '@/modules/admin/admin.service.js';
import dashboardService from '@/modules/admin/dashboard.service.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';

const router = express.Router();

router.get('/', asyncHandler(adminService.getStatus));
router.get('/dashboard', asyncHandler(dashboardService.getDashboard));

export default router;
