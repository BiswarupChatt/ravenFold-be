import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';
import inventoryController from '@/modules/inventory/controllers/inventory.controller.js';
import {
  adjustInventoryStockSchema,
  commitInventorySaleSchema,
  createInventoryStockSchema,
  releaseInventoryReservationSchema,
  reserveInventoryStockSchema,
  updateInventoryStockSchema,
} from '@/modules/inventory/inventory.validator.js';
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
  validate(adjustInventoryStockSchema),
  asyncHandler(inventoryController.adjustInventoryStock),
);

router.post(
  '/admin/reserve',
  authenticateUser,
  adminMiddleware,
  validate(reserveInventoryStockSchema),
  asyncHandler(inventoryController.reserveInventoryStock),
);

router.post(
  '/admin/release',
  authenticateUser,
  adminMiddleware,
  validate(releaseInventoryReservationSchema),
  asyncHandler(inventoryController.releaseInventoryReservation),
);

router.post(
  '/admin/commit',
  authenticateUser,
  adminMiddleware,
  validate(commitInventorySaleSchema),
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
  .post(authenticateUser, adminMiddleware, validate(createInventoryStockSchema), asyncHandler(inventoryController.createInventoryStock));

router
  .route('/admin/:inventoryStockId')
  .patch(authenticateUser, adminMiddleware, validate(updateInventoryStockSchema), asyncHandler(inventoryController.updateInventoryStock))
  .delete(authenticateUser, adminMiddleware, asyncHandler(inventoryController.deleteInventoryStock));

export default router;
