const REVIEW_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  HIDDEN: 'HIDDEN',
});

const REVIEW_REMINDER_STATUS = Object.freeze({
  FAILED: 'FAILED',
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SENT: 'SENT',
  SKIPPED: 'SKIPPED',
});

const REVIEW_LIMITS = Object.freeze({
  MAX_COMMENT_LENGTH: 2000,
  MAX_IMAGES: 5,
  MAX_RATING: 5,
  MAX_TITLE_LENGTH: 150,
  MIN_COMMENT_LENGTH: 10,
  MIN_RATING: 1,
});

const REVIEW_ELIGIBILITY_REASON = Object.freeze({
  CUSTOMER_EMAIL_UNAVAILABLE: 'CUSTOMER_EMAIL_UNAVAILABLE',
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
  ITEM_CANCELLED: 'ITEM_CANCELLED',
  ITEM_REFUNDED: 'ITEM_REFUNDED',
  ORDER_ITEM_NOT_FOUND: 'ORDER_ITEM_NOT_FOUND',
  ORDER_NOT_DELIVERED: 'ORDER_NOT_DELIVERED',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_NOT_OWNED_BY_USER: 'ORDER_NOT_OWNED_BY_USER',
  PRODUCT_DELETED: 'PRODUCT_DELETED',
  PRODUCT_MISMATCH: 'PRODUCT_MISMATCH',
  REVIEW_ALREADY_EXISTS: 'REVIEW_ALREADY_EXISTS',
  VARIANT_MISMATCH: 'VARIANT_MISMATCH',
});

const REVIEW_ELIGIBILITY_MESSAGE = Object.freeze({
  [REVIEW_ELIGIBILITY_REASON.CUSTOMER_EMAIL_UNAVAILABLE]: 'A review reminder cannot be sent because the customer email is unavailable.',
  [REVIEW_ELIGIBILITY_REASON.CUSTOMER_NOT_FOUND]: 'The customer account for this order could not be found.',
  [REVIEW_ELIGIBILITY_REASON.ITEM_CANCELLED]: 'This item is no longer eligible for review because it was cancelled.',
  [REVIEW_ELIGIBILITY_REASON.ITEM_REFUNDED]: 'This item is no longer eligible for review because it was refunded or returned.',
  [REVIEW_ELIGIBILITY_REASON.ORDER_ITEM_NOT_FOUND]: 'The selected order item could not be found.',
  [REVIEW_ELIGIBILITY_REASON.ORDER_NOT_DELIVERED]: 'You can review this product only after it has been delivered.',
  [REVIEW_ELIGIBILITY_REASON.ORDER_NOT_FOUND]: 'The selected order could not be found.',
  [REVIEW_ELIGIBILITY_REASON.ORDER_NOT_OWNED_BY_USER]: 'This order does not belong to you.',
  [REVIEW_ELIGIBILITY_REASON.PRODUCT_DELETED]: 'This product is no longer available for review.',
  [REVIEW_ELIGIBILITY_REASON.PRODUCT_MISMATCH]: 'The selected product does not match the purchased order item.',
  [REVIEW_ELIGIBILITY_REASON.REVIEW_ALREADY_EXISTS]: 'You have already reviewed this order item.',
  [REVIEW_ELIGIBILITY_REASON.VARIANT_MISMATCH]: 'The selected product variant does not match the purchased order item.',
});

const REVIEW_SORT = Object.freeze({
  HIGHEST_RATING: 'highest_rating',
  LOWEST_RATING: 'lowest_rating',
  NEWEST: 'newest',
  OLDEST: 'oldest',
});

const getReviewEligibilityMessage = (reason = '') => {
  return REVIEW_ELIGIBILITY_MESSAGE[reason] || 'Review is not allowed for this order item.';
};

export {
  REVIEW_ELIGIBILITY_REASON,
  REVIEW_ELIGIBILITY_MESSAGE,
  REVIEW_LIMITS,
  REVIEW_REMINDER_STATUS,
  REVIEW_SORT,
  REVIEW_STATUS,
  getReviewEligibilityMessage,
};

export default {
  REVIEW_ELIGIBILITY_REASON,
  REVIEW_ELIGIBILITY_MESSAGE,
  REVIEW_LIMITS,
  REVIEW_REMINDER_STATUS,
  REVIEW_SORT,
  REVIEW_STATUS,
  getReviewEligibilityMessage,
};
