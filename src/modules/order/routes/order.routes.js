import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import orderService from '@/modules/order/services/order.service.js';

const router = express.Router();

router.get('/', asyncHandler(orderService.getStatus));

export default router;
