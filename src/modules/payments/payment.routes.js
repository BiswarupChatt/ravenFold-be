import express from 'express';

import paymentController from '@/modules/payments/payment.controller.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';

const router = express.Router();

router.get('/', asyncHandler(paymentController.getStatus));
router.post('/webhook', asyncHandler(paymentController.handleWebhook));

export default router;
