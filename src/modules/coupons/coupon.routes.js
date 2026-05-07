import express from 'express';

import couponService from '@/modules/coupons/coupon.service.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';

const router = express.Router();

router.get('/', asyncHandler(couponService.getStatus));

export default router;
