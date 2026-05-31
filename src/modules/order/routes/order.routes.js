import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import orderController from '@/modules/order/controllers/order.controller.js';

const router = express.Router();

router.get('/', asyncHandler(orderController.getStatus));

router.get(
  '/admin',
  authenticateUser,
  adminMiddleware,
  asyncHandler(orderController.listAdminOrders),
);

router.get(
  '/admin/:orderId',
  authenticateUser,
  adminMiddleware,
  asyncHandler(orderController.getAdminOrder),
);

router.post('/checkout', authenticateUser, asyncHandler(orderController.createCheckoutOrder));

export default router;
