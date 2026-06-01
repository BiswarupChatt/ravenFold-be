import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import refundController from '@/modules/payment/controllers/refund.controller.js';

const router = express.Router();

router
  .route('/admin')
  .get(authenticateUser, adminMiddleware, asyncHandler(refundController.listAdminRefunds))
  .post(authenticateUser, adminMiddleware, asyncHandler(refundController.createAdminRefund));

export default router;
