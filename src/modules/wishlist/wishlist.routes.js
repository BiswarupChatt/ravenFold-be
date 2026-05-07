import express from 'express';

import wishlistService from '@/modules/wishlist/wishlist.service.js';
import { sendSuccess } from '@/common/helpers/response.helper.js';

const router = express.Router();

router.get('/', (req, res) => {
  sendSuccess(res, wishlistService.getStatus(), 'Wishlist module ready');
});

export default router;
