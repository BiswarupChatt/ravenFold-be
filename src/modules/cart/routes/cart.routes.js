import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import cartService from '@/modules/cart/services/cart.service.js';

const router = express.Router();

router.get('/', asyncHandler(cartService.getStatus));

export default router;
