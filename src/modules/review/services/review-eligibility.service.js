import {
  ORDER_STATUS,
  PAYMENT_STATUS,
} from '@/common/constants/order.constant.js';
import ApiError from '@/common/errors/api.error.js';
import {
  assertDatabaseReady,
  getDocumentId,
  normalizeObjectId,
  normalizeOptionalObjectId,
} from '@/common/utils/service.util.js';
import OrderItem from '@/modules/order/models/order-item.model.js';
import Order from '@/modules/order/models/order.model.js';
import Product from '@/modules/product/models/product.model.js';
import Review from '@/modules/review/models/review.model.js';
import { REVIEW_ELIGIBILITY_REASON, getReviewEligibilityMessage } from '@/modules/review/review.constants.js';

const ineligiblePaymentStatuses = new Set([
  PAYMENT_STATUS.PARTIALLY_REFUNDED,
  PAYMENT_STATUS.REFUNDED,
]);

const terminalIneligibleOrderStatuses = new Map([
  [ORDER_STATUS.CANCELLED, REVIEW_ELIGIBILITY_REASON.ITEM_CANCELLED],
  [ORDER_STATUS.RETURNED, REVIEW_ELIGIBILITY_REASON.ITEM_REFUNDED],
]);

const buildEligibilityResult = (overrides = {}) => ({
  eligible: false,
  existingReview: null,
  order: null,
  orderItem: null,
  product: null,
  reason: '',
  ...overrides,
});

const resolveExistingReview = async ({ orderItemId, userId }) => {
  return Review.findOne({
    deletedAt: null,
    orderItemId,
    userId,
  })
    .lean()
    .exec();
};

const checkEligibility = async ({
  orderId: orderIdValue,
  orderItemId: orderItemIdValue,
  productId: productIdValue,
  userId: userIdValue,
  variantId: variantIdValue = null,
}) => {
  assertDatabaseReady();
  const userId = normalizeObjectId(userIdValue, 'user id');
  const orderId = normalizeObjectId(orderIdValue, 'order id');
  const orderItemId = normalizeObjectId(orderItemIdValue, 'order item id');
  const productId = normalizeObjectId(productIdValue, 'product id');
  const variantId = normalizeOptionalObjectId(variantIdValue, 'variant id');
  const order = await Order.findById(orderId).lean().exec();

  if (!order) {
    return buildEligibilityResult({ reason: REVIEW_ELIGIBILITY_REASON.ORDER_NOT_FOUND });
  }

  if (getDocumentId(order.userId) !== userId) {
    return buildEligibilityResult({ order, reason: REVIEW_ELIGIBILITY_REASON.ORDER_NOT_OWNED_BY_USER });
  }

  const orderItem = await OrderItem.findOne({
    _id: orderItemId,
    orderId: order._id,
  })
    .lean()
    .exec();

  if (!orderItem) {
    return buildEligibilityResult({ order, reason: REVIEW_ELIGIBILITY_REASON.ORDER_ITEM_NOT_FOUND });
  }

  if (getDocumentId(orderItem.productId) !== productId) {
    return buildEligibilityResult({ order, orderItem, reason: REVIEW_ELIGIBILITY_REASON.PRODUCT_MISMATCH });
  }

  if (variantId && getDocumentId(orderItem.variantId) !== variantId) {
    return buildEligibilityResult({ order, orderItem, reason: REVIEW_ELIGIBILITY_REASON.VARIANT_MISMATCH });
  }

  if (terminalIneligibleOrderStatuses.has(order.status)) {
    return buildEligibilityResult({
      order,
      orderItem,
      reason: terminalIneligibleOrderStatuses.get(order.status),
    });
  }

  if (ineligiblePaymentStatuses.has(order.paymentStatus)) {
    return buildEligibilityResult({ order, orderItem, reason: REVIEW_ELIGIBILITY_REASON.ITEM_REFUNDED });
  }

  if (order.status !== ORDER_STATUS.DELIVERED) {
    return buildEligibilityResult({ order, orderItem, reason: REVIEW_ELIGIBILITY_REASON.ORDER_NOT_DELIVERED });
  }

  const product = await Product.findById(productId).lean().exec();

  if (!product) {
    return buildEligibilityResult({ order, orderItem, reason: REVIEW_ELIGIBILITY_REASON.PRODUCT_DELETED });
  }

  const existingReview = await resolveExistingReview({
    orderItemId: orderItem._id,
    userId,
  });

  if (existingReview) {
    return buildEligibilityResult({
      eligible: false,
      existingReview,
      order,
      orderItem,
      product,
      reason: REVIEW_ELIGIBILITY_REASON.REVIEW_ALREADY_EXISTS,
    });
  }

  return buildEligibilityResult({
    eligible: true,
    existingReview: null,
    order,
    orderItem,
    product,
    reason: '',
  });
};

const assertEligible = async (payload) => {
  const result = await checkEligibility(payload);

  if (!result.eligible) {
    throw new ApiError(409, getReviewEligibilityMessage(result.reason));
  }

  return result;
};

export {
  assertEligible,
  checkEligibility,
};

export default {
  assertEligible,
  checkEligibility,
};
