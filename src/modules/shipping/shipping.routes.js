import express from 'express';

import shippingService from '@/modules/shipping/shipping.service.js';
import { sendSuccess } from '@/common/helpers/response.helper.js';

const router = express.Router();

router.get('/', (req, res) => {
  sendSuccess(res, shippingService.getStatus(), 'Shipping module ready');
});

export default router;
