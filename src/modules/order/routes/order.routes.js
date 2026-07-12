import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';
import orderController from '@/modules/order/controllers/order.controller.js';
import {
  createCheckoutOrderSchema,
  updateAdminOrderStatusSchema,
} from '@/modules/order/order.validator.js';

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

router.patch(
  '/admin/:orderId/status',
  authenticateUser,
  adminMiddleware,
  validate(updateAdminOrderStatusSchema),
  asyncHandler(orderController.updateAdminOrderStatus),
);

router.get('/me', authenticateUser, asyncHandler(orderController.listCustomerOrders));
router.get('/me/:orderId', authenticateUser, asyncHandler(orderController.getCustomerOrder));
router.post('/checkout', authenticateUser, validate(createCheckoutOrderSchema), asyncHandler(orderController.createCheckoutOrder));

export default router;
