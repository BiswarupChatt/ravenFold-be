import express from 'express';

import cartService from '@/modules/cart/cart.service.js';
import { sendSuccess } from '@/common/helpers/response.helper.js';

const router = express.Router();

router.get('/', (req, res) => {
  sendSuccess(res, cartService.getStatus(), 'Cart module ready');
});

export default router;
