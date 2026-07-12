import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';
import shippingController from '@/modules/shipping/controllers/shipping.controller.js';
import {
  createPickupLocationSchema,
  createProviderOrderSchema,
  markOrderPackedSchema,
  syncShipmentTrackingSchema,
  updatePickupLocationSchema,
} from '@/modules/shipping/shipping.validator.js';

const router = express.Router();

router.get('/', asyncHandler(shippingController.getStatus));
router.post('/webhooks/shiprocket', asyncHandler(shippingController.handleShiprocketWebhook));

router.get(
  '/admin/providers/:providerName/test',
  authenticateUser,
  adminMiddleware,
  asyncHandler(shippingController.testShippingProviderConnection),
);

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

router.get(
  '/admin/pickup-locations/:pickupLocationIdOrCode',
  authenticateUser,
  adminMiddleware,
  asyncHandler(shippingController.getAdminPickupLocation),
);

router
  .route('/admin/pickup-locations')
  .get(authenticateUser, adminMiddleware, asyncHandler(shippingController.listAdminPickupLocations))
  .post(authenticateUser, adminMiddleware, validate(createPickupLocationSchema), asyncHandler(shippingController.createPickupLocation));

router
  .route('/admin/pickup-locations/:pickupLocationId')
  .patch(authenticateUser, adminMiddleware, validate(updatePickupLocationSchema), asyncHandler(shippingController.updatePickupLocation))
  .delete(authenticateUser, adminMiddleware, asyncHandler(shippingController.deletePickupLocation));

router.post(
  '/admin/shipments/:shipmentId/sync-tracking',
  authenticateUser,
  adminMiddleware,
  validate(syncShipmentTrackingSchema),
  asyncHandler(shippingController.syncShipmentTracking),
);

export default router;
