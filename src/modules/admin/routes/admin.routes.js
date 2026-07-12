import express from 'express';

import adminService from '@/modules/admin/services/admin.service.js';
import dashboardService from '@/modules/admin/services/dashboard.service.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminReviewRoutes from '@/modules/review/routes/admin-review.routes.js';

const router = express.Router();

router.get('/', asyncHandler(adminService.getStatus));
router.get('/dashboard', asyncHandler(dashboardService.getDashboard));
router.use('/reviews', adminReviewRoutes);

export default router;
