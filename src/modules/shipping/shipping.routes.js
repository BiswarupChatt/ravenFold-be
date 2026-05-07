import express from 'express';

import shippingService from '@/modules/shipping/shipping.service.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';

const router = express.Router();

router.get('/', asyncHandler(shippingService.getStatus));

export default router;
