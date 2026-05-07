import express from 'express';

import paymentService from '@/modules/payments/payment.service.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';

const router = express.Router();

router.get('/', asyncHandler(paymentService.getStatus));
router.post('/webhook', asyncHandler(paymentService.handleWebhook));

export default router;
