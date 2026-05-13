import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import reviewService from '@/modules/review/services/review.service.js';

const router = express.Router();

router.get('/', asyncHandler(reviewService.getStatus));

export default router;
