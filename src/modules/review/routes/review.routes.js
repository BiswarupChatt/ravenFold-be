import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';
import reviewController from '@/modules/review/controllers/review.controller.js';
import { createReviewSchema, updateReviewSchema } from '@/modules/review/review.validator.js';

const router = express.Router();

router.get('/status', asyncHandler(reviewController.getStatus));
router.get('/products/:productId/summary', asyncHandler(reviewController.getProductReviewSummary));
router.get('/products/:productId', asyncHandler(reviewController.listProductReviews));
router.post('/uploads/cloudinary-signature', authenticateUser, asyncHandler(reviewController.createReviewUploadSignature));
router.get('/eligibility', authenticateUser, asyncHandler(reviewController.getReviewEligibility));
router.get('/my', authenticateUser, asyncHandler(reviewController.listMyReviews));
router.post('/', authenticateUser, validate(createReviewSchema), asyncHandler(reviewController.createReview));
router.patch('/:reviewId', authenticateUser, validate(updateReviewSchema), asyncHandler(reviewController.updateReview));
router.delete('/:reviewId', authenticateUser, asyncHandler(reviewController.deleteReview));

export default router;
