import express from 'express';

import orderService from '@/modules/orders/order.service.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';

const router = express.Router();

router.get('/', asyncHandler(orderService.getStatus));

export default router;
