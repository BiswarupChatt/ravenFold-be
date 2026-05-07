import express from 'express';

import orderController from '@/modules/orders/order.controller.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';

const router = express.Router();

router.get('/', asyncHandler(orderController.getStatus));

export default router;
