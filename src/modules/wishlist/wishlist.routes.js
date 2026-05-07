import express from 'express';

import wishlistService from '@/modules/wishlist/wishlist.service.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';

const router = express.Router();

router.get('/', asyncHandler(wishlistService.getStatus));

export default router;
