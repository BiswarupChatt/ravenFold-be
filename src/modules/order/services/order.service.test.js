import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateTotals } from '@/modules/order/services/order.service.js';

test('calculateTotals includes promotion-backed snapshot fields in checkout pricing', () => {
  const totals = calculateTotals(
    [
      {
        lineTotal: 1000,
        priceAtTime: 1000,
        priceSnapshot: {
          basePrice: 1200,
        },
        quantity: 1,
      },
    ],
    {
      appliedPromotions: [
        {
          couponCode: 'SAVE10',
          discountAmount: 100,
          promotionId: '6870c14d5d3b59cfd5a01001',
          shippingDiscountAmount: 0,
          title: 'Save 10',
          type: 'COUPON',
        },
      ],
      productDiscountAmount: 100,
      shippingCharge: 80,
      shippingDiscountAmount: 80,
    },
  );

  assert.equal(totals.totalMrp, 1200);
  assert.equal(totals.bagDiscount, 200);
  assert.equal(totals.couponDiscount, 100);
  assert.equal(totals.productDiscountAmount, 100);
  assert.equal(totals.shippingDiscountAmount, 80);
  assert.equal(totals.totalPayable, 900);
  assert.equal(totals.appliedPromotions.length, 1);
  assert.equal(totals.appliedPromotions[0].couponCode, 'SAVE10');
});
