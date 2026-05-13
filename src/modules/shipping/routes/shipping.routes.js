import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import shippingService from '@/modules/shipping/services/shipping.service.js';

const router = express.Router();

router.get('/', asyncHandler(shippingService.getStatus));

export default router;
