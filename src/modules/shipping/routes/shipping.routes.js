import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import shippingController from '@/modules/shipping/controllers/shipping.controller.js';

const router = express.Router();

router.get('/', asyncHandler(shippingController.getStatus));

router.get(
  '/admin/orders/:orderId/shipments',
  authenticateUser,
  adminMiddleware,
  asyncHandler(shippingController.listOrderShipments),
);

router.post(
  '/admin/orders/:orderId/pack',
  authenticateUser,
  adminMiddleware,
  asyncHandler(shippingController.markOrderPacked),
);

router.post(
  '/admin/orders/:orderId/shipments',
  authenticateUser,
  adminMiddleware,
  asyncHandler(shippingController.createShipmentForOrder),
);

router.patch(
  '/admin/shipments/:shipmentId/status',
  authenticateUser,
  adminMiddleware,
  asyncHandler(shippingController.updateShipmentStatus),
);

router.post(
  '/admin/shipments/:shipmentId/cancel',
  authenticateUser,
  adminMiddleware,
  asyncHandler(shippingController.cancelShipment),
);

export default router;
