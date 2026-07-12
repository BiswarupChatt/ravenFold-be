import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';
import shippingController from '@/modules/shipping/controllers/shipping.controller.js';
import {
  createProviderOrderSchema,
  markOrderPackedSchema,
  syncShipmentTrackingSchema,
} from '@/modules/shipping/shipping.validator.js';

const router = express.Router();

router.get('/', asyncHandler(shippingController.getStatus));
router.post('/webhooks/shiprocket', asyncHandler(shippingController.handleShiprocketWebhook));

router.post(
  '/admin/orders/:orderId/pack',
  authenticateUser,
  adminMiddleware,
  validate(markOrderPackedSchema),
  asyncHandler(shippingController.markOrderPacked),
);

router.post(
  '/admin/orders/:orderId/provider-order',
  authenticateUser,
  adminMiddleware,
  validate(createProviderOrderSchema),
  asyncHandler(shippingController.createProviderOrderForOrder),
);

router.post(
  '/admin/shipments/:shipmentId/sync-tracking',
  authenticateUser,
  adminMiddleware,
  validate(syncShipmentTrackingSchema),
  asyncHandler(shippingController.syncShipmentTracking),
);

export default router;
