import { sendSuccess } from '@/common/helpers/response.helper.js';
import reviewService from '@/modules/review/services/review.service.js';

const listAdminReviews = async (req, res) => {
  return sendSuccess(res, await reviewService.listAdminReviews(req.query), 'Reviews fetched');
};

const getAdminReview = async (req, res) => {
  return sendSuccess(res, await reviewService.getAdminReview(req.params.reviewId), 'Review fetched');
};

const approveReview = async (req, res) => {
  return sendSuccess(res, await reviewService.approveReview(req.user, req.params.reviewId, req.body), 'Review approved');
};

const rejectReview = async (req, res) => {
  return sendSuccess(res, await reviewService.rejectReview(req.user, req.params.reviewId, req.body), 'Review rejected');
};

const hideReview = async (req, res) => {
  return sendSuccess(res, await reviewService.hideReview(req.user, req.params.reviewId, req.body), 'Review hidden');
};

const restoreReview = async (req, res) => {
  return sendSuccess(res, await reviewService.restoreReview(req.user, req.params.reviewId), 'Review restored');
};

const deleteReview = async (req, res) => {
  return sendSuccess(res, await reviewService.deleteAdminReview(req.user, req.params.reviewId), 'Review deleted');
};

export {
  approveReview,
  deleteReview,
  getAdminReview,
  hideReview,
  listAdminReviews,
  rejectReview,
  restoreReview,
};

export default {
  approveReview,
  deleteReview,
  getAdminReview,
  hideReview,
  listAdminReviews,
  rejectReview,
  restoreReview,
};
