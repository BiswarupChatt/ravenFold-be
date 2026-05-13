import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import analyticsService from '@/modules/analytics/services/analytics.service.js';

const router = express.Router();

router.get('/', asyncHandler(analyticsService.getStatus));

export default router;
