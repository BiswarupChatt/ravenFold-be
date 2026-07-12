import test from 'node:test';
import assert from 'node:assert/strict';

import {
  REVIEW_ELIGIBILITY_REASON,
  getReviewEligibilityMessage,
} from '@/modules/review/review.constants.js';

test('getReviewEligibilityMessage returns customer-friendly review gating copy', () => {
  assert.equal(
    getReviewEligibilityMessage(REVIEW_ELIGIBILITY_REASON.ORDER_NOT_DELIVERED),
    'You can review this product only after it has been delivered.',
  );
  assert.equal(
    getReviewEligibilityMessage(REVIEW_ELIGIBILITY_REASON.REVIEW_ALREADY_EXISTS),
    'You have already reviewed this order item.',
  );
});

test('getReviewEligibilityMessage falls back safely for unknown reason codes', () => {
  assert.equal(
    getReviewEligibilityMessage('UNKNOWN_REASON'),
    'Review is not allowed for this order item.',
  );
});
