import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import stockMovementController from '@/modules/inventory/controllers/stock-movement.controller.js';

const router = express.Router();

router.get(
  '/admin/:movementId',
  authenticateUser,
  adminMiddleware,
  asyncHandler(stockMovementController.getAdminStockMovement),
);

router.get(
  '/admin',
  authenticateUser,
  adminMiddleware,
  asyncHandler(stockMovementController.listAdminStockMovements),
);

export default router;
