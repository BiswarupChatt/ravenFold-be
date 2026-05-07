import express from 'express';

import reviewService from '@/modules/reviews/review.service.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';

const router = express.Router();

router.get('/', asyncHandler(reviewService.getStatus));

export default router;
