import ApiError from '@/common/errors/api.error.js';
import {
  formatImageAssets,
  getAddedCloudinaryPublicIds,
  getRemovedCloudinaryPublicIds,
  normalizeImageAssets,
} from '@/common/utils/media-asset.util.js';
import { getPagination } from '@/common/utils/pagination.util.js';
import { getDisplayName } from '@/common/utils/user-name.util.js';
import {
  assertDatabaseReady,
  escapeRegex,
  getDocumentId,
  hasOwn,
  isValidObjectId,
  normalizeBoolean,
  normalizeObjectId,
  normalizeOptionalObjectId,
  normalizeText,
} from '@/common/utils/service.util.js';
import OrderItem from '@/modules/order/models/order-item.model.js';
import Order from '@/modules/order/models/order.model.js';
import ProductVariant from '@/modules/product/models/product-variant.model.js';
import Product from '@/modules/product/models/product.model.js';
import Review from '@/modules/review/models/review.model.js';
import {
  REVIEW_ELIGIBILITY_MESSAGE,
  REVIEW_LIMITS,
  REVIEW_REMINDER_STATUS,
  REVIEW_SORT,
  REVIEW_STATUS,
  getReviewEligibilityMessage,
} from '@/modules/review/review.constants.js';
import { assertEligible, checkEligibility } from '@/modules/review/services/review-eligibility.service.js';
import { getProductRatingSummary, recalculateProductRatingSummary } from '@/modules/review/services/review-rating.service.js';
import User from '@/modules/users/models/user.model.js';
import cloudinaryService from '@/infrastructure/storage/cloudinary.service.js';

const publicReviewPopulate = [
  { path: 'userId', select: 'firstName lastName name avatar' },
];

const ownReviewPopulate = [
  { path: 'productId', select: 'name slug images' },
  { path: 'variantId', select: 'optionValues sku' },
  { path: 'orderId', select: 'orderNumber placedAt status paymentStatus' },
  { path: 'orderItemId', select: 'productSnapshot quantity priceAtTime lineTotal' },
];

const adminReviewPopulate = [
  { path: 'userId', select: 'firstName lastName name email phone avatar role isActive' },
  { path: 'productId', select: 'name slug sku images status averageRating reviewCount' },
  { path: 'variantId', select: 'sku optionValues isActive' },
  { path: 'orderId', select: 'orderNumber status paymentStatus placedAt totalPayable' },
  { path: 'orderItemId', select: 'productSnapshot quantity priceAtTime lineTotal' },
  { path: 'moderatedBy', select: 'firstName lastName name email role' },
];

const sortableAdminFields = new Set(['createdAt', 'updatedAt', 'rating', 'status']);

const normalizeActorId = (actor = null) => {
  if (!actor?.id) {
    throw new ApiError(401, 'Authentication required');
  }

  return normalizeObjectId(actor.id, 'authenticated user');
};

const normalizeRating = (value) => {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue < REVIEW_LIMITS.MIN_RATING || numericValue > REVIEW_LIMITS.MAX_RATING) {
    throw new ApiError(400, `rating must be between ${REVIEW_LIMITS.MIN_RATING} and ${REVIEW_LIMITS.MAX_RATING}`);
  }

  return numericValue;
};

const normalizeImages = (value) => {
  if (value === null || value === undefined || value === '') {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ApiError(400, 'images must be an array');
  }

  const images = normalizeImageAssets(value, { maxItems: REVIEW_LIMITS.MAX_IMAGES });

  if (images.length > REVIEW_LIMITS.MAX_IMAGES) {
    throw new ApiError(400, `images cannot contain more than ${REVIEW_LIMITS.MAX_IMAGES} items`);
  }

  return images;
};

const normalizeReviewText = (value, { field, maxLength, required = false, minLength = 0 } = {}) => {
  const text = normalizeText(value);

  if (!text) {
    if (required) {
      throw new ApiError(400, `${field} is required`);
    }

    return '';
  }

  if (text.length < minLength) {
    throw new ApiError(400, `${field} must be at least ${minLength} characters`);
  }

  if (maxLength && text.length > maxLength) {
    throw new ApiError(400, `${field} cannot be longer than ${maxLength} characters`);
  }

  return text;
};

const normalizeReviewStatus = (value) => {
  const normalizedValue = normalizeText(value).toUpperCase();

  if (!normalizedValue) {
    return '';
  }

  if (!Object.values(REVIEW_STATUS).includes(normalizedValue)) {
    throw new ApiError(400, `status must be one of: ${Object.values(REVIEW_STATUS).join(', ')}`);
  }

  return normalizedValue;
};

const maskDisplayName = (name = '') => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return 'Verified customer';
  }

  return parts.map((part) => `${part.charAt(0)}${'*'.repeat(Math.max(part.length - 1, 3))}`).join(' ');
};

const formatVariantSummary = (variant) => {
  if (!variant) {
    return null;
  }

  return {
    id: getDocumentId(variant._id || variant.id),
    label: Array.isArray(variant.optionValues)
      ? variant.optionValues.map((entry) => `${entry.optionName}: ${entry.value}`).join(', ')
      : '',
    optionValues: Array.isArray(variant.optionValues) ? variant.optionValues : [],
    sku: variant.sku || '',
  };
};

const formatPublicReview = (review) => ({
  comment: review.comment || '',
  createdAt: review.createdAt,
  customer: {
    displayName: maskDisplayName(getDisplayName(review.userId)),
  },
  id: getDocumentId(review._id || review.id),
  imageAssets: formatImageAssets(review.images || []),
  images: formatImageAssets(review.images || []),
  isVerifiedPurchase: review.isVerifiedPurchase !== false,
  rating: review.rating,
  title: review.title || '',
});

const formatOwnReview = (review) => ({
  comment: review.comment || '',
  createdAt: review.createdAt,
  id: getDocumentId(review._id || review.id),
  imageAssets: formatImageAssets(review.images || []),
  images: formatImageAssets(review.images || []),
  isVerifiedPurchase: review.isVerifiedPurchase !== false,
  order: review.orderId
    ? {
      id: getDocumentId(review.orderId._id || review.orderId.id),
      orderNumber: review.orderId.orderNumber || '',
      paymentStatus: review.orderId.paymentStatus || '',
      placedAt: review.orderId.placedAt || null,
      status: review.orderId.status || '',
    }
    : null,
  orderItem: review.orderItemId
    ? {
      id: getDocumentId(review.orderItemId._id || review.orderItemId.id),
      lineTotal: Number(review.orderItemId.lineTotal || 0),
      priceAtTime: Number(review.orderItemId.priceAtTime || 0),
      productSnapshot: review.orderItemId.productSnapshot || null,
      quantity: Number(review.orderItemId.quantity || 0),
    }
    : null,
  product: review.productId
    ? {
      id: getDocumentId(review.productId._id || review.productId.id),
      imageAssets: formatImageAssets(review.productId.images || []),
      images: formatImageAssets(review.productId.images || []),
      name: review.productId.name || '',
      slug: review.productId.slug || '',
    }
    : null,
  rating: review.rating,
  status: review.status,
  title: review.title || '',
  updatedAt: review.updatedAt,
  variant: formatVariantSummary(review.variantId),
});

const formatAdminReview = (review) => ({
  adminNote: review.adminNote || '',
  approvedAt: review.approvedAt || null,
  comment: review.comment || '',
  createdAt: review.createdAt,
  customer: review.userId
    ? {
      avatar: review.userId.avatar || '',
      email: review.userId.email || '',
      firstName: review.userId.firstName || '',
      id: getDocumentId(review.userId._id || review.userId.id),
      isActive: review.userId.isActive !== false,
      lastName: review.userId.lastName || '',
      name: getDisplayName(review.userId),
      phone: review.userId.phone || '',
      role: review.userId.role || '',
    }
    : null,
  hiddenAt: review.hiddenAt || null,
  id: getDocumentId(review._id || review.id),
  imageAssets: formatImageAssets(review.images || []),
  images: formatImageAssets(review.images || []),
  isVerifiedPurchase: review.isVerifiedPurchase !== false,
  moderatedAt: review.moderatedAt || null,
  moderatedBy: review.moderatedBy
    ? {
      email: review.moderatedBy.email || '',
      firstName: review.moderatedBy.firstName || '',
      id: getDocumentId(review.moderatedBy._id || review.moderatedBy.id),
      lastName: review.moderatedBy.lastName || '',
      name: getDisplayName(review.moderatedBy),
      role: review.moderatedBy.role || '',
    }
    : null,
  order: review.orderId
    ? {
      id: getDocumentId(review.orderId._id || review.orderId.id),
      orderNumber: review.orderId.orderNumber || '',
      paymentStatus: review.orderId.paymentStatus || '',
      placedAt: review.orderId.placedAt || null,
      status: review.orderId.status || '',
      totalPayable: Number(review.orderId.totalPayable || 0),
    }
    : null,
  orderItem: review.orderItemId
    ? {
      id: getDocumentId(review.orderItemId._id || review.orderItemId.id),
      lineTotal: Number(review.orderItemId.lineTotal || 0),
      priceAtTime: Number(review.orderItemId.priceAtTime || 0),
      productSnapshot: review.orderItemId.productSnapshot || null,
      quantity: Number(review.orderItemId.quantity || 0),
    }
    : null,
  product: review.productId
    ? {
      averageRating: Number(review.productId.averageRating || 0),
      id: getDocumentId(review.productId._id || review.productId.id),
      imageAssets: formatImageAssets(review.productId.images || []),
      images: formatImageAssets(review.productId.images || []),
      name: review.productId.name || '',
      reviewCount: Number(review.productId.reviewCount || 0),
      sku: review.productId.sku || '',
      slug: review.productId.slug || '',
      status: review.productId.status || '',
    }
    : null,
  rating: review.rating,
  rejectedAt: review.rejectedAt || null,
  status: review.status,
  title: review.title || '',
  updatedAt: review.updatedAt,
  variant: formatVariantSummary(review.variantId),
});

const getStatusData = () => ({
  eligibilityReasons: REVIEW_ELIGIBILITY_MESSAGE,
  module: 'reviews',
  reminderStatuses: Object.values(REVIEW_REMINDER_STATUS),
  statuses: Object.values(REVIEW_STATUS),
});

const ensureProductExists = async (productIdValue) => {
  const productId = normalizeObjectId(productIdValue, 'product id');
  const productExists = await Product.exists({ _id: productId }).exec();

  if (!productExists) {
    throw new ApiError(404, 'Product not found');
  }

  return productId;
};

const loadReviewByIdForUser = async ({ reviewId, userId }) => {
  const normalizedReviewId = normalizeObjectId(reviewId, 'review id');
  const review = await Review.findOne({
    _id: normalizedReviewId,
    deletedAt: null,
    userId,
  }).exec();

  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  return review;
};

const loadReviewByIdForAdmin = async (reviewId) => {
  const normalizedReviewId = normalizeObjectId(reviewId, 'review id');
  const review = await Review.findOne({
    _id: normalizedReviewId,
    deletedAt: null,
  }).exec();

  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  return review;
};

const buildPublicReviewQuery = (productId, query = {}) => {
  const filter = {
    deletedAt: null,
    productId,
    status: REVIEW_STATUS.APPROVED,
  };
  const rating = normalizeText(query.rating);

  if (rating) {
    filter.rating = normalizeRating(rating);
  }

  if (hasOwn(query, 'verifiedOnly') && normalizeBoolean(query.verifiedOnly, 'verifiedOnly')) {
    filter.isVerifiedPurchase = true;
  }

  return filter;
};

const resolvePublicReviewSort = (query = {}) => {
  const sortKey = normalizeText(query.sortBy).toLowerCase();

  switch (sortKey) {
    case REVIEW_SORT.OLDEST:
      return { createdAt: 1 };
    case REVIEW_SORT.HIGHEST_RATING:
      return { rating: -1, createdAt: -1 };
    case REVIEW_SORT.LOWEST_RATING:
      return { rating: 1, createdAt: -1 };
    case REVIEW_SORT.NEWEST:
    default:
      return { createdAt: -1 };
  }
};

const listPublicProductReviews = async (productIdValue, query = {}) => {
  assertDatabaseReady();
  const productId = await ensureProductExists(productIdValue);
  const { limit, page, skip } = getPagination(query);
  const filter = buildPublicReviewQuery(productId, query);
  const sort = resolvePublicReviewSort(query);
  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate(publicReviewPopulate)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    Review.countDocuments(filter).exec(),
  ]);

  return {
    pagination: {
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
      limit,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    },
    reviews: reviews.map(formatPublicReview),
  };
};

const getPublicProductReviewSummary = async (productIdValue) => {
  return getProductRatingSummary(productIdValue);
};

const listMyReviews = async (actor, query = {}) => {
  assertDatabaseReady();
  const userId = normalizeActorId(actor);
  const { limit, page, skip } = getPagination(query);
  const filter = {
    deletedAt: null,
    userId,
  };
  const orderId = normalizeText(query.orderId);
  const status = normalizeText(query.status);

  if (orderId) {
    filter.orderId = normalizeObjectId(orderId, 'order id');
  }

  if (status && status.toLowerCase() !== 'all') {
    filter.status = normalizeReviewStatus(status);
  }

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate(ownReviewPopulate)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    Review.countDocuments(filter).exec(),
  ]);

  return {
    items: reviews.map(formatOwnReview),
    pagination: {
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
      limit,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getReviewEligibility = async (actor, query = {}) => {
  assertDatabaseReady();
  const userId = normalizeActorId(actor);
  const orderId = normalizeText(query.orderId);

  if (!orderId) {
    throw new ApiError(400, 'orderId is required');
  }

  const normalizedOrderId = normalizeObjectId(orderId, 'order id');

  if (!normalizeText(query.orderItemId)) {
    const order = await Order.findOne({
      _id: normalizedOrderId,
      userId,
    }).lean().exec();

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    const orderItems = await OrderItem.find({ orderId: order._id }).sort({ createdAt: 1 }).lean().exec();
    const existingReviews = await Review.find({
      deletedAt: null,
      orderId: order._id,
      userId,
    })
      .select('orderItemId status rating updatedAt title')
      .lean()
      .exec();
    const reviewByOrderItemId = new Map(
      existingReviews.map((review) => [getDocumentId(review.orderItemId), review]),
    );

    return {
      items: await Promise.all(orderItems.map(async (orderItem) => {
        const existingReview = reviewByOrderItemId.get(getDocumentId(orderItem._id)) || null;
        const eligibility = await checkEligibility({
          orderId: order._id,
          orderItemId: orderItem._id,
          productId: orderItem.productId,
          userId,
          variantId: orderItem.variantId,
        });

        return {
          eligible: eligibility.eligible,
          orderItemId: getDocumentId(orderItem._id),
          productId: getDocumentId(orderItem.productId),
          productSnapshot: orderItem.productSnapshot || null,
          reason: eligibility.reason || '',
          reasonMessage: eligibility.reason ? getReviewEligibilityMessage(eligibility.reason) : '',
          review: existingReview
            ? {
              id: getDocumentId(existingReview._id || existingReview.id),
              rating: existingReview.rating,
              status: existingReview.status,
              title: existingReview.title || '',
              updatedAt: existingReview.updatedAt,
            }
            : null,
          variantId: getDocumentId(orderItem.variantId),
        };
      })),
      orderId: getDocumentId(normalizedOrderId),
    };
  }

  const result = await checkEligibility({
    orderId: normalizedOrderId,
    orderItemId: query.orderItemId,
    productId: query.productId,
    userId,
    variantId: query.variantId,
  });

  return {
    eligible: result.eligible,
    existingReview: result.existingReview
      ? {
        id: getDocumentId(result.existingReview._id || result.existingReview.id),
        rating: result.existingReview.rating,
        status: result.existingReview.status,
      }
      : null,
    orderId: getDocumentId(normalizedOrderId),
    orderItemId: getDocumentId(normalizeObjectId(query.orderItemId, 'order item id')),
    productId: getDocumentId(normalizeObjectId(query.productId, 'product id')),
    reason: result.reason || '',
    reasonMessage: result.reason ? getReviewEligibilityMessage(result.reason) : '',
    variantId: getDocumentId(normalizeOptionalObjectId(query.variantId, 'variant id')),
  };
};

const createReview = async (actor, payload = {}) => {
  assertDatabaseReady();
  const userId = normalizeActorId(actor);
  const rating = normalizeRating(payload.rating);
  const comment = normalizeReviewText(payload.comment, {
    field: 'comment',
    maxLength: REVIEW_LIMITS.MAX_COMMENT_LENGTH,
    minLength: REVIEW_LIMITS.MIN_COMMENT_LENGTH,
    required: true,
  });
  const title = normalizeReviewText(payload.title, {
    field: 'title',
    maxLength: REVIEW_LIMITS.MAX_TITLE_LENGTH,
  });
  const images = normalizeImages(payload.images);
  const eligibility = await assertEligible({
    orderId: payload.orderId,
    orderItemId: payload.orderItemId,
    productId: payload.productId,
    userId,
    variantId: payload.variantId,
  });

  try {
    const review = await Review.create({
      comment,
      images,
      isVerifiedPurchase: true,
      orderId: eligibility.order._id,
      orderItemId: eligibility.orderItem._id,
      productId: eligibility.product._id,
      rating,
      status: REVIEW_STATUS.PENDING,
      title,
      userId,
      variantId: eligibility.orderItem.variantId || null,
    });

    return formatOwnReview(await Review.findById(review._id).populate(ownReviewPopulate).lean().exec());
  } catch (error) {
    await cloudinaryService.deleteImages(getAddedCloudinaryPublicIds([], images));

    if (error?.code === 11000) {
      throw new ApiError(409, 'Review already exists for this order item');
    }

    throw error;
  }
};

const updateReview = async (actor, reviewId, payload = {}) => {
  assertDatabaseReady();
  const userId = normalizeActorId(actor);
  const review = await loadReviewByIdForUser({ reviewId, userId });
  const previousImages = review.images || [];
  const wasApproved = review.status === REVIEW_STATUS.APPROVED;

  if (hasOwn(payload, 'rating')) {
    review.rating = normalizeRating(payload.rating);
  }

  if (hasOwn(payload, 'title')) {
    review.title = normalizeReviewText(payload.title, {
      field: 'title',
      maxLength: REVIEW_LIMITS.MAX_TITLE_LENGTH,
    });
  }

  if (hasOwn(payload, 'comment')) {
    review.comment = normalizeReviewText(payload.comment, {
      field: 'comment',
      maxLength: REVIEW_LIMITS.MAX_COMMENT_LENGTH,
      minLength: REVIEW_LIMITS.MIN_COMMENT_LENGTH,
      required: true,
    });
  }

  if (hasOwn(payload, 'images')) {
    review.images = normalizeImages(payload.images);
  }

  review.status = REVIEW_STATUS.PENDING;
  review.adminNote = '';
  review.moderatedBy = null;
  review.moderatedAt = null;
  review.approvedAt = null;
  review.rejectedAt = null;
  review.hiddenAt = null;
  try {
    await review.save();
  } catch (error) {
    if (hasOwn(payload, 'images')) {
      await cloudinaryService.deleteImages(getAddedCloudinaryPublicIds(previousImages, review.images || []));
    }

    throw error;
  }

  if (wasApproved) {
    await recalculateProductRatingSummary(review.productId);
  }

  if (hasOwn(payload, 'images')) {
    await cloudinaryService.deleteImages(getRemovedCloudinaryPublicIds(previousImages, review.images || []));
  }

  return formatOwnReview(await Review.findById(review._id).populate(ownReviewPopulate).lean().exec());
};

const softDeleteReview = async ({ actorId, review }) => {
  review.deletedAt = new Date();
  review.deletedBy = actorId;
  await review.save();
};

const deleteOwnReview = async (actor, reviewId) => {
  assertDatabaseReady();
  const userId = normalizeActorId(actor);
  const review = await loadReviewByIdForUser({ reviewId, userId });
  const wasApproved = review.status === REVIEW_STATUS.APPROVED;

  await softDeleteReview({ actorId: userId, review });

  if (wasApproved) {
    await recalculateProductRatingSummary(review.productId);
  }

  return {
    id: getDocumentId(review._id),
  };
};

const loadHydratedAdminReview = async (reviewId) => {
  return Review.findById(reviewId)
    .populate(adminReviewPopulate)
    .lean()
    .exec();
};

const applyModerationState = async ({
  adminNote = '',
  actorId,
  review,
  status,
}) => {
  const previousStatus = review.status;
  const now = new Date();

  review.status = status;
  review.adminNote = normalizeText(adminNote);
  review.moderatedAt = now;
  review.moderatedBy = actorId;
  review.approvedAt = status === REVIEW_STATUS.APPROVED ? now : null;
  review.rejectedAt = status === REVIEW_STATUS.REJECTED ? now : null;
  review.hiddenAt = status === REVIEW_STATUS.HIDDEN ? now : null;
  await review.save();

  if (previousStatus === REVIEW_STATUS.APPROVED || status === REVIEW_STATUS.APPROVED) {
    await recalculateProductRatingSummary(review.productId);
  }

  return formatAdminReview(await loadHydratedAdminReview(review._id));
};

const approveReview = async (actor, reviewId, payload = {}) => {
  assertDatabaseReady();
  const actorId = normalizeActorId(actor);
  const review = await loadReviewByIdForAdmin(reviewId);

  return applyModerationState({
    actorId,
    adminNote: payload.adminNote,
    review,
    status: REVIEW_STATUS.APPROVED,
  });
};

const rejectReview = async (actor, reviewId, payload = {}) => {
  assertDatabaseReady();
  const actorId = normalizeActorId(actor);
  const review = await loadReviewByIdForAdmin(reviewId);

  return applyModerationState({
    actorId,
    adminNote: payload.adminNote,
    review,
    status: REVIEW_STATUS.REJECTED,
  });
};

const hideReview = async (actor, reviewId, payload = {}) => {
  assertDatabaseReady();
  const actorId = normalizeActorId(actor);
  const review = await loadReviewByIdForAdmin(reviewId);

  return applyModerationState({
    actorId,
    adminNote: payload.adminNote,
    review,
    status: REVIEW_STATUS.HIDDEN,
  });
};

const restoreReview = async (actor, reviewId) => {
  assertDatabaseReady();
  const actorId = normalizeActorId(actor);
  const review = await loadReviewByIdForAdmin(reviewId);

  if (review.status !== REVIEW_STATUS.HIDDEN) {
    throw new ApiError(409, 'Only hidden reviews can be restored');
  }

  return applyModerationState({
    actorId,
    adminNote: review.adminNote,
    review,
    status: REVIEW_STATUS.APPROVED,
  });
};

const deleteAdminReview = async (actor, reviewId) => {
  assertDatabaseReady();
  const actorId = normalizeActorId(actor);
  const review = await loadReviewByIdForAdmin(reviewId);
  const wasApproved = review.status === REVIEW_STATUS.APPROVED;

  await softDeleteReview({ actorId, review });

  if (wasApproved) {
    await recalculateProductRatingSummary(review.productId);
  }

  return {
    id: getDocumentId(review._id),
  };
};

const buildAdminReviewSearchFilter = async (searchValue = '') => {
  const search = normalizeText(searchValue);

  if (!search) {
    return null;
  }

  const searchRegex = new RegExp(escapeRegex(search), 'i');
  const [users, products, orders] = await Promise.all([
    User.find({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { name: searchRegex },
        { phone: searchRegex },
      ],
    }).select('_id').lean().exec(),
    Product.find({
      $or: [
        { name: searchRegex },
        { slug: searchRegex },
        { sku: searchRegex },
      ],
    }).select('_id').lean().exec(),
    Order.find({ orderNumber: searchRegex }).select('_id').lean().exec(),
  ]);
  const searchConditions = [
    { comment: searchRegex },
    { title: searchRegex },
  ];

  if (users.length > 0) {
    searchConditions.push({ userId: { $in: users.map((entry) => entry._id) } });
  }

  if (products.length > 0) {
    searchConditions.push({ productId: { $in: products.map((entry) => entry._id) } });
  }

  if (orders.length > 0) {
    searchConditions.push({ orderId: { $in: orders.map((entry) => entry._id) } });
  }

  if (isValidObjectId(search)) {
    searchConditions.push(
      { _id: search },
      { userId: search },
      { productId: search },
      { orderId: search },
      { orderItemId: search },
    );
  }

  return { $or: searchConditions };
};

const buildAdminReviewFilter = async (query = {}) => {
  const filter = {
    deletedAt: null,
  };
  const status = normalizeText(query.status);
  const rating = normalizeText(query.rating);
  const productId = normalizeText(query.productId);
  const userId = normalizeText(query.userId);
  const dateFrom = normalizeText(query.dateFrom);
  const dateTo = normalizeText(query.dateTo);

  if (status && status.toLowerCase() !== 'all') {
    filter.status = normalizeReviewStatus(status);
  }

  if (rating) {
    filter.rating = normalizeRating(rating);
  }

  if (productId) {
    filter.productId = normalizeObjectId(productId, 'product id');
  }

  if (userId) {
    filter.userId = normalizeObjectId(userId, 'user id');
  }

  if (dateFrom || dateTo) {
    filter.createdAt = {};

    if (dateFrom) {
      filter.createdAt.$gte = new Date(dateFrom);
    }

    if (dateTo) {
      filter.createdAt.$lte = new Date(dateTo);
    }
  }

  const searchFilter = await buildAdminReviewSearchFilter(query.search);

  if (searchFilter) {
    Object.assign(filter, searchFilter);
  }

  return filter;
};

const resolveAdminReviewSort = (query = {}) => {
  const sortBy = normalizeText(query.sortBy) || 'createdAt';
  const sortOrder = normalizeText(query.sortOrder).toLowerCase() === 'asc' ? 1 : -1;

  if (!sortableAdminFields.has(sortBy)) {
    return { createdAt: -1 };
  }

  return { [sortBy]: sortOrder, createdAt: -1 };
};

const listAdminReviews = async (query = {}) => {
  assertDatabaseReady();
  const { limit, page, skip } = getPagination(query);
  const filter = await buildAdminReviewFilter(query);
  const sort = resolveAdminReviewSort(query);
  const [reviews, total, pendingCount] = await Promise.all([
    Review.find(filter)
      .populate(adminReviewPopulate)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    Review.countDocuments(filter).exec(),
    Review.countDocuments({
      deletedAt: null,
      status: REVIEW_STATUS.PENDING,
    }).exec(),
  ]);

  return {
    items: reviews.map(formatAdminReview),
    pendingCount,
    pagination: {
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
      limit,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getAdminReview = async (reviewId) => {
  assertDatabaseReady();
  const review = await loadReviewByIdForAdmin(reviewId);

  return formatAdminReview(await loadHydratedAdminReview(review._id));
};

export {
  approveReview,
  createReview,
  deleteAdminReview,
  deleteOwnReview,
  getAdminReview,
  getPublicProductReviewSummary,
  getReviewEligibility,
  getStatusData,
  hideReview,
  listAdminReviews,
  listMyReviews,
  listPublicProductReviews,
  rejectReview,
  restoreReview,
  updateReview,
};

export default {
  approveReview,
  createReview,
  deleteAdminReview,
  deleteOwnReview,
  getAdminReview,
  getPublicProductReviewSummary,
  getReviewEligibility,
  getStatusData,
  hideReview,
  listAdminReviews,
  listMyReviews,
  listPublicProductReviews,
  rejectReview,
  restoreReview,
  updateReview,
};
