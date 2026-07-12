import test from 'node:test';
import assert from 'node:assert/strict';

import { formatRatingSummary } from '@/modules/review/services/review-rating.service.js';

test('formatRatingSummary rounds average and backfills missing rating buckets', () => {
  const summary = formatRatingSummary('product-1', {
    averageRating: 4.36,
    ratingDistribution: { 5: 8, 4: 3, 1: 1 },
    totalReviews: 12,
  });

  assert.equal(summary.productId, 'product-1');
  assert.equal(summary.averageRating, 4.4);
  assert.equal(summary.totalReviews, 12);
  assert.deepEqual(summary.ratingDistribution, {
    1: 1,
    2: 0,
    3: 0,
    4: 3,
    5: 8,
  });
});
