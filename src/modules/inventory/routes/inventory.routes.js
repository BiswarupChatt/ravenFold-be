import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import inventoryController from '@/modules/inventory/controllers/inventory.controller.js';
import stockMovementRoutes from '@/modules/inventory/routes/stock-movement.routes.js';

const router = express.Router();

router.get('/status', asyncHandler(inventoryController.getStatus));
router.use('/movements', stockMovementRoutes);

router.get(
  '/admin/item',
  authenticateUser,
  adminMiddleware,
  asyncHandler(inventoryController.getAdminInventoryStockForTarget),
);

router.post(
  '/admin/adjust',
  authenticateUser,
  adminMiddleware,
  asyncHandler(inventoryController.adjustInventoryStock),
);

router.post(
  '/admin/reserve',
  authenticateUser,
  adminMiddleware,
  asyncHandler(inventoryController.reserveInventoryStock),
);

router.post(
  '/admin/release',
  authenticateUser,
  adminMiddleware,
  asyncHandler(inventoryController.releaseInventoryReservation),
);

router.post(
  '/admin/commit',
  authenticateUser,
  adminMiddleware,
  asyncHandler(inventoryController.commitInventorySale),
);

router.get(
  '/admin/:inventoryStockId',
  authenticateUser,
  adminMiddleware,
  asyncHandler(inventoryController.getAdminInventoryStock),
);

router
  .route('/admin')
  .get(authenticateUser, adminMiddleware, asyncHandler(inventoryController.listAdminInventoryStocks))
  .post(authenticateUser, adminMiddleware, asyncHandler(inventoryController.createInventoryStock));

router
  .route('/admin/:inventoryStockId')
  .patch(authenticateUser, adminMiddleware, asyncHandler(inventoryController.updateInventoryStock))
  .delete(authenticateUser, adminMiddleware, asyncHandler(inventoryController.deleteInventoryStock));

export default router;
