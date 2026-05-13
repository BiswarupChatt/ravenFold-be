import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import paymentService from '@/modules/payment/services/payment.service.js';

const router = express.Router();

router.get('/', asyncHandler(paymentService.getStatus));
router.post('/webhook', asyncHandler(paymentService.handleWebhook));

export default router;
