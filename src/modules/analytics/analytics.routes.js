import express from 'express';

import analyticsService from '@/modules/analytics/analytics.service.js';
import asyncHandler from '@/common/helpers/asyncHandler.helper.js';

const router = express.Router();

router.get('/', asyncHandler(analyticsService.getStatus));

export default router;
