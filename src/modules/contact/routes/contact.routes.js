import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import { createRateLimiter } from '@/common/middleware/rateLimit.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';
import contactController from '@/modules/contact/controllers/contact.controller.js';
import { contactInquirySchema } from '@/modules/contact/contact.validator.js';

const router = express.Router();

const contactRateLimiter = createRateLimiter({
  keyPrefix: 'contact',
  max: 5,
  message: 'Too many contact messages. Please try again later.',
  windowMs: 60 * 60 * 1000,
});

router.post(
  '/',
  contactRateLimiter,
  validate(contactInquirySchema),
  asyncHandler(contactController.createContactInquiry),
);

export default router;
