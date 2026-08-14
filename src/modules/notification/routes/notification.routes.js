import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import notificationController from '@/modules/notification/controllers/notification.controller.js';

const router = express.Router();

router.get('/whatsapp/webhook', asyncHandler(notificationController.verifyWhatsappWebhook));
router.post('/whatsapp/webhook', asyncHandler(notificationController.handleWhatsappWebhook));

export default router;
