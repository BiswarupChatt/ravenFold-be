import express from 'express';

import analyticsService from '@/modules/analytics/analytics.service.js';
import { sendSuccess } from '@/common/helpers/response.helper.js';

const router = express.Router();

router.get('/', (req, res) => {
  sendSuccess(res, analyticsService.getStatus(), 'Analytics module ready');
});

export default router;
