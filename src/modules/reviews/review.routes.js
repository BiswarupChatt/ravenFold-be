import express from 'express';

import reviewService from '@/modules/reviews/review.service.js';
import { sendSuccess } from '@/common/helpers/response.helper.js';

const router = express.Router();

router.get('/', (req, res) => {
  sendSuccess(res, reviewService.getStatus(), 'Reviews module ready');
});

export default router;
