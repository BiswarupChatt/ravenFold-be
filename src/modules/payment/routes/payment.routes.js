import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import { rateLimiters } from '@/common/middleware/rateLimit.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';
import paymentController from '@/modules/payment/controllers/payment.controller.js';
import {
  createPaymentSessionSchema,
  recordPaymentAttemptFailureSchema,
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
router.post('/session', authenticateUser, rateLimiters.payment, validate(createPaymentSessionSchema), asyncHandler(paymentController.createPaymentSession));
router.get(
  '/attempts/:paymentAttemptId/status',
  authenticateUser,
  rateLimiters.payment,
  asyncHandler(paymentController.getPaymentAttemptStatus),
);
router.post(
  '/attempts/:paymentAttemptId/verify',
  authenticateUser,
  rateLimiters.payment,
  validate(verifyPaymentAttemptSchema),
  asyncHandler(paymentController.verifyPaymentAttempt),
);
router.post(
  '/attempts/:paymentAttemptId/failure',
  authenticateUser,
  rateLimiters.payment,
  validate(recordPaymentAttemptFailureSchema),
  asyncHandler(paymentController.recordPaymentAttemptFailure),
);
router.post('/webhooks/:provider', rateLimiters.webhook, asyncHandler(paymentController.handleProviderWebhook));
router.post('/webhook', rateLimiters.webhook, asyncHandler(paymentController.handleWebhook));

export default router;
