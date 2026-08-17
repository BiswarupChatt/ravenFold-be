import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import { rateLimiters } from '@/common/middleware/rateLimit.middleware.js';
import notificationController from '@/modules/notification/controllers/notification.controller.js';

const router = express.Router();

router.get('/whatsapp/webhook', rateLimiters.webhook, asyncHandler(notificationController.verifyWhatsappWebhook));
router.post('/whatsapp/webhook', rateLimiters.webhook, asyncHandler(notificationController.handleWhatsappWebhook));

export default router;
