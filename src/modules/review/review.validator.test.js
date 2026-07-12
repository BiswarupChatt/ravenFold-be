import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createReviewSchema,
  moderationSchema,
  updateReviewSchema,
} from '@/modules/review/review.validator.js';

test('createReviewSchema keeps supported review fields and strips unsupported ones', () => {
  const result = createReviewSchema.validate({
    comment: 'The product quality is excellent.',
    extraField: 'should be rejected',
    orderId: 'order-1',
    orderItemId: 'item-1',
    productId: 'product-1',
    rating: '5',
  });

  assert.ok(result.error);
  assert.equal(
    result.error.details[0].message,
    'body contains unsupported field(s): extraField',
  );
});

test('updateReviewSchema requires at least one editable field', () => {
  const result = updateReviewSchema.validate({});

  assert.ok(result.error);
  assert.equal(
    result.error.details[0].message,
    'body must include at least one supported field',
  );
});

test('moderationSchema accepts an optional admin note', () => {
  const result = moderationSchema.validate({
    adminNote: 'Contains abusive language.',
  });

  assert.equal(result.error, null);
  assert.deepEqual(result.value, { adminNote: 'Contains abusive language.' });
});
