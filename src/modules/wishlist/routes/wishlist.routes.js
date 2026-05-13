import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import wishlistService from '@/modules/wishlist/services/wishlist.service.js';

const router = express.Router();

router.get('/', asyncHandler(wishlistService.getStatus));

export default router;
