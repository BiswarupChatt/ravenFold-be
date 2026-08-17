import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import { rateLimiters } from '@/common/middleware/rateLimit.middleware.js';
import {
  multipleImageUpload,
  singleImageUpload,
} from '@/common/middleware/image-upload.middleware.js';
import uploadController from '@/modules/upload/upload.controller.js';

const router = express.Router();

router.post(
  '/images',
  authenticateUser,
  rateLimiters.upload,
  singleImageUpload,
  asyncHandler(uploadController.uploadSingleImage),
);

router.post(
  '/images/multiple',
  authenticateUser,
  rateLimiters.upload,
  multipleImageUpload,
  asyncHandler(uploadController.uploadMultipleImages),
);

export default router;
