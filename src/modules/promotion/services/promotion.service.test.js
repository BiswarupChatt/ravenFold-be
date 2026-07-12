import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import Promotion from '@/modules/promotion/models/promotion.model.js';
import PromotionUsage from '@/modules/promotion/models/promotion-usage.model.js';
import { recordPromotionUsageForOrder } from '@/modules/promotion/services/promotion.service.js';

test('recordPromotionUsageForOrder creates usages idempotently and increments usedCount only for new entries', async () => {
  const originalUsageUpdateOne = PromotionUsage.updateOne;
  const originalPromotionUpdateMany = Promotion.updateMany;
  const previousReadyState = mongoose.connection.readyState;
  let updateOneCalls = 0;
  let incrementIds = [];

  Object.defineProperty(mongoose.connection, 'readyState', {
    configurable: true,
    value: 1,
  });

  PromotionUsage.updateOne = () => ({
    exec: async () => {
      updateOneCalls += 1;

      return {
        upsertedCount: updateOneCalls === 1 ? 1 : 0,
      };
    },
  });

  Promotion.updateMany = (filter) => ({
    exec: async () => {
      incrementIds = filter._id.$in;
      return { acknowledged: true };
    },
  });

  try {
    const result = await recordPromotionUsageForOrder({
      _id: '6870c14d5d3b59cfd5a02001',
      appliedPromotions: [
        {
          couponCode: 'SAVE10',
          discountAmount: 100,
          promotionId: '6870c14d5d3b59cfd5a02011',
          shippingDiscountAmount: 0,
        },
        {
          couponCode: '',
          discountAmount: 50,
          promotionId: '6870c14d5d3b59cfd5a02012',
          shippingDiscountAmount: 0,
        },
      ],
      paidAt: new Date('2026-07-12T10:00:00.000Z'),
      userId: '6870c14d5d3b59cfd5a02021',
    });

    assert.equal(result.createdUsageCount, 1);
    assert.equal(result.createdUsageIds.length, 1);
    assert.equal(incrementIds.length, 1);
    assert.equal(incrementIds[0], '6870c14d5d3b59cfd5a02011');
  } finally {
    PromotionUsage.updateOne = originalUsageUpdateOne;
    Promotion.updateMany = originalPromotionUpdateMany;
    Object.defineProperty(mongoose.connection, 'readyState', {
      configurable: true,
      value: previousReadyState,
    });
  }
});
