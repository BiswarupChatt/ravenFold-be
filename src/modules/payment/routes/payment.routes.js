import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import paymentController from '@/modules/payment/controllers/payment.controller.js';
import refundRoutes from '@/modules/payment/routes/refund.routes.js';

const router = express.Router();

router.get('/', asyncHandler(paymentController.getStatus));
router.use('/refunds', refundRoutes);
router.post('/session', authenticateUser, asyncHandler(paymentController.createPaymentSession));
router.get(
  '/attempts/:paymentAttemptId/status',
  authenticateUser,
  asyncHandler(paymentController.getPaymentAttemptStatus),
);
router.post(
  '/attempts/:paymentAttemptId/verify',
  authenticateUser,
  asyncHandler(paymentController.verifyPaymentAttempt),
);
router.post('/webhooks/:provider', asyncHandler(paymentController.handleProviderWebhook));
router.post('/webhook', asyncHandler(paymentController.handleWebhook));

export default router;
