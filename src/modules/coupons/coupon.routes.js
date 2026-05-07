import express from 'express';

import couponService from '@/modules/coupons/coupon.service.js';
import { sendSuccess } from '@/common/helpers/response.helper.js';

const router = express.Router();

router.get('/', (req, res) => {
  sendSuccess(res, couponService.getStatus(), 'Coupons module ready');
});

export default router;
