import { sendSuccess } from '@/common/helpers/response.helper.js';
import cloudinaryService from '@/infrastructure/storage/cloudinary.service.js';
import reviewService from '@/modules/review/services/review.service.js';

const getStatus = async (req, res) => {
  return sendSuccess(res, reviewService.getStatusData(), 'Reviews module ready');
};

const createReviewUploadSignature = async (req, res) => {
  return sendSuccess(
    res,
    cloudinaryService.createReviewImageUploadSignature(),
    'Cloudinary upload signature created',
    201,
  );
};

const createReview = async (req, res) => {
  return sendSuccess(res, await reviewService.createReview(req.user, req.body), 'Review submitted', 201);
};

const updateReview = async (req, res) => {
  return sendSuccess(res, await reviewService.updateReview(req.user, req.params.reviewId, req.body), 'Review updated');
};

const deleteReview = async (req, res) => {
  return sendSuccess(res, await reviewService.deleteOwnReview(req.user, req.params.reviewId), 'Review deleted');
};

const listMyReviews = async (req, res) => {
  return sendSuccess(res, await reviewService.listMyReviews(req.user, req.query), 'Reviews fetched');
};

const getReviewEligibility = async (req, res) => {
  return sendSuccess(res, await reviewService.getReviewEligibility(req.user, req.query), 'Review eligibility fetched');
};

const listProductReviews = async (req, res) => {
  return sendSuccess(res, await reviewService.listPublicProductReviews(req.params.productId, req.query), 'Reviews fetched');
};

const getProductReviewSummary = async (req, res) => {
  return sendSuccess(res, await reviewService.getPublicProductReviewSummary(req.params.productId), 'Review summary fetched');
};

export {
  createReview,
  createReviewUploadSignature,
  deleteReview,
  getProductReviewSummary,
  getReviewEligibility,
  getStatus,
  listMyReviews,
  listProductReviews,
  updateReview,
};

export default {
  createReview,
  createReviewUploadSignature,
  deleteReview,
  getProductReviewSummary,
  getReviewEligibility,
  getStatus,
  listMyReviews,
  listProductReviews,
  updateReview,
};
