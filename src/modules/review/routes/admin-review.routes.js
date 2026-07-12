import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import validate from '@/common/middleware/validate.middleware.js';
import adminReviewController from '@/modules/review/controllers/admin-review.controller.js';
import { moderationSchema } from '@/modules/review/review.validator.js';

const router = express.Router();

router.get('/', asyncHandler(adminReviewController.listAdminReviews));
router.get('/:reviewId', asyncHandler(adminReviewController.getAdminReview));
router.patch('/:reviewId/approve', validate(moderationSchema), asyncHandler(adminReviewController.approveReview));
router.patch('/:reviewId/reject', validate(moderationSchema), asyncHandler(adminReviewController.rejectReview));
router.patch('/:reviewId/hide', validate(moderationSchema), asyncHandler(adminReviewController.hideReview));
router.patch('/:reviewId/restore', asyncHandler(adminReviewController.restoreReview));
router.delete('/:reviewId', asyncHandler(adminReviewController.deleteReview));

export default router;
