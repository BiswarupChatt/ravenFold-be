import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import couponService from '@/modules/coupon/services/coupon.service.js';

const router = express.Router();

router.get('/', asyncHandler(couponService.getStatus));

export default router;
