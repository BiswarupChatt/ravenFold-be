import express from 'express';

import cartService from '@/modules/cart/cart.service.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';

const router = express.Router();

router.get('/', asyncHandler(cartService.getStatus));

export default router;
