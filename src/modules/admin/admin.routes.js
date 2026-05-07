import express from 'express';

import adminService from '@/modules/admin/admin.service.js';
import dashboardService from '@/modules/admin/dashboard.service.js';
import { sendSuccess } from '@/common/helpers/response.helper.js';

const router = express.Router();

router.get('/', (req, res) => {
  sendSuccess(res, adminService.getStatus(), 'Admin module ready');
});

router.get('/dashboard', (req, res) => {
  sendSuccess(res, dashboardService.getDashboard(), 'Admin dashboard ready');
});

export default router;
