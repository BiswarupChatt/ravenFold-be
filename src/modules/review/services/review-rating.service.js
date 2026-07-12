import ApiError from '@/common/errors/api.error.js';
import {
  assertDatabaseReady,
  normalizeObjectId,
} from '@/common/utils/service.util.js';
import Product from '@/modules/product/models/product.model.js';
import Review from '@/modules/review/models/review.model.js';
import { REVIEW_STATUS } from '@/modules/review/review.constants.js';

const EMPTY_DISTRIBUTION = Object.freeze({
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
});

const cloneEmptyDistribution = () => ({
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
});

const formatRatingSummary = (productId, {
  averageRating = 0,
  ratingDistribution = null,
  totalReviews = 0,
} = {}) => ({
  averageRating: Number(Number(averageRating || 0).toFixed(1)),
  productId,
  ratingDistribution: {
    ...cloneEmptyDistribution(),
    ...(ratingDistribution || {}),
  },
  totalReviews: Number(totalReviews || 0),
});

const aggregateApprovedReviewSummary = async (productId) => {
  const summaryRows = await Review.aggregate([
    {
      $match: {
        productId,
        status: REVIEW_STATUS.APPROVED,
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 },
        totalReviews: { $sum: 1 },
        totalRating: { $sum: '$rating' },
      },
    },
  ]).exec();
  const distribution = cloneEmptyDistribution();
  let totalReviews = 0;
  let totalRating = 0;

  for (const row of summaryRows) {
    const ratingKey = Number(row._id);

    if (!distribution[ratingKey]) {
      distribution[ratingKey] = 0;
    }

    distribution[ratingKey] = Number(row.count || 0);
    totalReviews += Number(row.count || 0);
    totalRating += Number(row.totalRating || 0);
  }

  return {
    averageRating: totalReviews ? totalRating / totalReviews : 0,
    ratingDistribution: distribution,
    totalReviews,
  };
};

const recalculateProductRatingSummary = async (productIdValue) => {
  assertDatabaseReady();
  const productId = normalizeObjectId(productIdValue, 'product id');
  const product = await Product.findById(productId).exec();

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const aggregated = await aggregateApprovedReviewSummary(product._id);

  product.averageRating = Number(aggregated.averageRating.toFixed(1));
  product.reviewCount = aggregated.totalReviews;
  product.ratingDistribution = aggregated.ratingDistribution;
  await product.save();

  return formatRatingSummary(productId, aggregated);
};

const getProductRatingSummary = async (productIdValue) => {
  assertDatabaseReady();
  const productId = normalizeObjectId(productIdValue, 'product id');
  const product = await Product.findById(productId)
    .select('averageRating reviewCount ratingDistribution')
    .lean()
    .exec();

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  return formatRatingSummary(productId, {
    averageRating: product.averageRating || 0,
    ratingDistribution: product.ratingDistribution || EMPTY_DISTRIBUTION,
    totalReviews: product.reviewCount || 0,
  });
};

export {
  formatRatingSummary,
  getProductRatingSummary,
  recalculateProductRatingSummary,
};

export default {
  formatRatingSummary,
  getProductRatingSummary,
  recalculateProductRatingSummary,
};
