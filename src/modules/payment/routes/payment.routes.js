import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';
import paymentController from '@/modules/payment/controllers/payment.controller.js';
import {
  createPaymentSessionSchema,
  verifyPaymentAttemptSchema,
} from '@/modules/payment/payment.validator.js';
import refundRoutes from '@/modules/payment/routes/refund.routes.js';

const router = express.Router();

router.get('/', asyncHandler(paymentController.getStatus));
router.use('/refunds', refundRoutes);
router.get(
  '/admin/payments',
  authenticateUser,
  adminMiddleware,
  asyncHandler(paymentController.listAdminPayments),
);
router.get(
  '/admin/attempts',
  authenticateUser,
  adminMiddleware,
  asyncHandler(paymentController.listAdminPaymentAttempts),
);
router.post('/session', authenticateUser, validate(createPaymentSessionSchema), asyncHandler(paymentController.createPaymentSession));
router.get(
  '/attempts/:paymentAttemptId/status',
  authenticateUser,
  asyncHandler(paymentController.getPaymentAttemptStatus),
);
router.post(
  '/attempts/:paymentAttemptId/verify',
  authenticateUser,
  validate(verifyPaymentAttemptSchema),
  asyncHandler(paymentController.verifyPaymentAttempt),
);
router.post('/webhooks/:provider', asyncHandler(paymentController.handleProviderWebhook));
router.post('/webhook', asyncHandler(paymentController.handleWebhook));

export default router;
