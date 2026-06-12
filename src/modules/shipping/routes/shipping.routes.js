import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import shippingController from '@/modules/shipping/controllers/shipping.controller.js';

const router = express.Router();

router.get('/', asyncHandler(shippingController.getStatus));
router.post('/webhooks/shiprocket', asyncHandler(shippingController.handleShiprocketWebhook));

router.get(
  '/admin/orders/:orderId/shipments',
  authenticateUser,
  adminMiddleware,
  asyncHandler(shippingController.listOrderShipments),
);

router.get(
  '/admin/providers/:providerName/test',
  authenticateUser,
  adminMiddleware,
  asyncHandler(shippingController.testShippingProviderConnection),
);

router.get(
  '/admin/providers/:providerName/pickup-locations',
  authenticateUser,
  adminMiddleware,
  asyncHandler(shippingController.getProviderPickupLocations),
);

router.get(
  '/admin/orders/:orderId/courier-options',
  authenticateUser,
  adminMiddleware,
  asyncHandler(shippingController.getCourierOptionsForOrder),
);

router.post(
  '/admin/orders/:orderId/pack',
  authenticateUser,
  adminMiddleware,
  asyncHandler(shippingController.markOrderPacked),
);

router.post(
  '/admin/orders/:orderId/provider-order',
  authenticateUser,
  adminMiddleware,
  asyncHandler(shippingController.createProviderOrderForOrder),
);

router.post(
  '/admin/orders/:orderId/shipments',
  authenticateUser,
  adminMiddleware,
  asyncHandler(shippingController.createShipmentForOrder),
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
  .post(authenticateUser, adminMiddleware, asyncHandler(shippingController.createPickupLocation));

router
  .route('/admin/pickup-locations/:pickupLocationId')
  .patch(authenticateUser, adminMiddleware, asyncHandler(shippingController.updatePickupLocation))
  .delete(authenticateUser, adminMiddleware, asyncHandler(shippingController.deletePickupLocation));

router.patch(
  '/admin/shipments/:shipmentId/assign-awb',
  authenticateUser,
  adminMiddleware,
  asyncHandler(shippingController.assignAwbToShipment),
);

router.post(
  '/admin/shipments/:shipmentId/schedule-pickup',
  authenticateUser,
  adminMiddleware,
  asyncHandler(shippingController.schedulePickupForShipment),
);

router.post(
  '/admin/shipments/:shipmentId/generate-label',
  authenticateUser,
  adminMiddleware,
  asyncHandler(shippingController.generateShipmentLabel),
);

router.post(
  '/admin/shipments/:shipmentId/generate-manifest',
  authenticateUser,
  adminMiddleware,
  asyncHandler(shippingController.generateShipmentManifest),
);

router.post(
  '/admin/shipments/:shipmentId/sync-tracking',
  authenticateUser,
  adminMiddleware,
  asyncHandler(shippingController.syncShipmentTracking),
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
