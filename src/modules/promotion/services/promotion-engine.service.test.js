import test from 'node:test';
import assert from 'node:assert/strict';

import { PROMOTION_APPLICABLE_ON, PROMOTION_DISCOUNT_METHOD, PROMOTION_TYPE } from '@/modules/promotion/constants/promotion.constants.js';
import buyXGetYEngine from '@/modules/promotion/engines/buy-x-get-y.engine.js';
import couponEngine from '@/modules/promotion/engines/coupon.engine.js';
import firstOrderEngine from '@/modules/promotion/engines/first-order.engine.js';
import fixedDiscountEngine from '@/modules/promotion/engines/fixed-discount.engine.js';
import freeShippingEngine from '@/modules/promotion/engines/free-shipping.engine.js';
import newUserEngine from '@/modules/promotion/engines/new-user.engine.js';
import percentageDiscountEngine from '@/modules/promotion/engines/percentage-discount.engine.js';
import { evaluatePromotions } from '@/modules/promotion/services/promotion-engine.service.js';

const emptyUsageSummary = {
  totalByPromotionId: new Map(),
  userByPromotionId: new Map(),
};

const buildPromotion = (overrides = {}) => ({
  categoryIds: [],
  couponCode: '',
  createdAt: new Date('2026-07-12T00:00:00.000Z'),
  discountMethod: PROMOTION_DISCOUNT_METHOD.PERCENTAGE,
  discountValue: 10,
  endDate: null,
  id: `promo-${Math.random().toString(36).slice(2, 10)}`,
  isActive: true,
  isAutomatic: true,
  isStackable: true,
  maxDiscountAmount: null,
  minOrderAmount: null,
  perUserLimit: null,
  priority: 0,
  productIds: [],
  startDate: null,
  title: 'Promotion',
  type: PROMOTION_TYPE.PERCENTAGE_DISCOUNT,
  usageLimit: null,
  usedCount: 0,
  ...overrides,
});

const buildContext = (overrides = {}) => ({
  couponCode: '',
  items: [],
  shippingCharge: 0,
  subtotal: 0,
  user: {
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    successfulOrderCount: 0,
  },
  userId: '6870c14d5d3b59cfd5a00001',
  ...overrides,
});

test('percentage discount engine respects max discount cap and category eligibility', async () => {
  const promotion = buildPromotion({
    applicableOn: PROMOTION_APPLICABLE_ON.SPECIFIC_CATEGORIES,
    categoryIds: ['6870c14d5d3b59cfd5a00011'],
    discountValue: 25,
    maxDiscountAmount: 200,
    type: PROMOTION_TYPE.CATEGORY_DISCOUNT,
  });
  const context = buildContext({
    items: [
      {
        categoryId: '6870c14d5d3b59cfd5a00011',
        lineSubtotal: 1000,
        productId: '6870c14d5d3b59cfd5a00111',
        quantity: 2,
        unitPrice: 500,
      },
      {
        categoryId: '6870c14d5d3b59cfd5a00012',
        lineSubtotal: 600,
        productId: '6870c14d5d3b59cfd5a00112',
        quantity: 1,
        unitPrice: 600,
      },
    ],
    subtotal: 1600,
  });

  const result = await percentageDiscountEngine.evaluate(promotion, context);

  assert.equal(result.discountAmount, 200);
  assert.equal(result.affectedItems.length, 1);
  assert.equal(result.affectedItems[0].discountAmount, 200);
});

test('fixed discount engine does not exceed eligible subtotal', async () => {
  const promotion = buildPromotion({
    applicableOn: PROMOTION_APPLICABLE_ON.SPECIFIC_PRODUCTS,
    discountMethod: PROMOTION_DISCOUNT_METHOD.FIXED,
    discountValue: 800,
    productIds: ['6870c14d5d3b59cfd5a00121'],
    type: PROMOTION_TYPE.FIXED_DISCOUNT,
  });
  const context = buildContext({
    items: [
      {
        categoryId: '6870c14d5d3b59cfd5a00021',
        lineSubtotal: 500,
        productId: '6870c14d5d3b59cfd5a00121',
        quantity: 1,
        unitPrice: 500,
      },
    ],
    subtotal: 500,
  });

  const result = await fixedDiscountEngine.evaluate(promotion, context);

  assert.equal(result.discountAmount, 500);
});

test('buy-x-get-y engine uses the lowest priced eligible units as free', async () => {
  const promotion = buildPromotion({
    applicableOn: PROMOTION_APPLICABLE_ON.SPECIFIC_PRODUCTS,
    buyQuantity: 1,
    discountValue: null,
    getQuantity: 1,
    productIds: ['6870c14d5d3b59cfd5a00131'],
    type: PROMOTION_TYPE.BUY_X_GET_Y,
  });
  const context = buildContext({
    items: [
      {
        categoryId: '6870c14d5d3b59cfd5a00031',
        lineSubtotal: 400,
        productId: '6870c14d5d3b59cfd5a00131',
        quantity: 2,
        unitPrice: 200,
      },
      {
        categoryId: '6870c14d5d3b59cfd5a00031',
        lineSubtotal: 100,
        productId: '6870c14d5d3b59cfd5a00131',
        quantity: 1,
        unitPrice: 100,
      },
    ],
    subtotal: 500,
  });

  const result = await buyXGetYEngine.evaluate(promotion, context);

  assert.equal(result.discountAmount, 100);
  assert.equal(result.freeItems[0].quantity, 1);
  assert.equal(result.freeItems[0].unitPrice, 100);
});

test('free shipping engine returns null when shipping charge is zero', async () => {
  const promotion = buildPromotion({
    type: PROMOTION_TYPE.FREE_SHIPPING,
  });
  const context = buildContext({
    items: [
      {
        categoryId: '6870c14d5d3b59cfd5a00041',
        lineSubtotal: 700,
        productId: '6870c14d5d3b59cfd5a00141',
        quantity: 1,
        requiresShipping: true,
        unitPrice: 700,
      },
    ],
    shippingCharge: 0,
    subtotal: 700,
  });

  const result = await freeShippingEngine.evaluate(promotion, context);

  assert.equal(result, null);
});

test('coupon engine rejects mismatched coupon codes', async () => {
  const promotion = buildPromotion({
    couponCode: 'SAVE20',
    discountValue: 20,
    type: PROMOTION_TYPE.COUPON,
  });
  const context = buildContext({
    couponCode: 'SAVE10',
    items: [
      {
        categoryId: '6870c14d5d3b59cfd5a00051',
        lineSubtotal: 1000,
        productId: '6870c14d5d3b59cfd5a00151',
        quantity: 2,
        unitPrice: 500,
      },
    ],
    subtotal: 1000,
  });

  const result = await couponEngine.evaluate(promotion, context);

  assert.equal(result, null);
});

test('first order engine rejects users with previous successful orders', async () => {
  const promotion = buildPromotion({
    discountValue: 15,
    type: PROMOTION_TYPE.FIRST_ORDER,
  });
  const context = buildContext({
    items: [
      {
        categoryId: '6870c14d5d3b59cfd5a00061',
        lineSubtotal: 1000,
        productId: '6870c14d5d3b59cfd5a00161',
        quantity: 1,
        unitPrice: 1000,
      },
    ],
    subtotal: 1000,
    user: {
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      successfulOrderCount: 1,
    },
  });

  const result = await firstOrderEngine.evaluate(promotion, context);

  assert.equal(result, null);
});

test('new user engine rejects accounts older than the configured eligibility window', async () => {
  const promotion = buildPromotion({
    discountValue: 15,
    type: PROMOTION_TYPE.NEW_USER,
  });
  const context = buildContext({
    items: [
      {
        categoryId: '6870c14d5d3b59cfd5a00071',
        lineSubtotal: 1000,
        productId: '6870c14d5d3b59cfd5a00171',
        quantity: 1,
        unitPrice: 1000,
      },
    ],
    subtotal: 1000,
    user: {
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      successfulOrderCount: 0,
    },
  });

  const result = await newUserEngine.evaluate(promotion, context);

  assert.equal(result, null);
});

test('central evaluator applies stackable product discount and free shipping together', async () => {
  const promotions = [
    buildPromotion({
      applicableOn: PROMOTION_APPLICABLE_ON.SPECIFIC_PRODUCTS,
      discountValue: 10,
      priority: 20,
      productIds: ['6870c14d5d3b59cfd5a00181'],
      title: 'Product 10%',
      type: PROMOTION_TYPE.PRODUCT_DISCOUNT,
    }),
    buildPromotion({
      priority: 10,
      title: 'Free Ship',
      type: PROMOTION_TYPE.FREE_SHIPPING,
    }),
  ];
  const context = buildContext({
    items: [
      {
        categoryId: '6870c14d5d3b59cfd5a00081',
        lineSubtotal: 1000,
        productId: '6870c14d5d3b59cfd5a00181',
        quantity: 1,
        requiresShipping: true,
        unitPrice: 1000,
      },
    ],
    shippingCharge: 120,
    subtotal: 1000,
  });

  const result = await evaluatePromotions({
    context,
    promotions,
    usageSummary: emptyUsageSummary,
  });

  assert.equal(result.productDiscountAmount, 100);
  assert.equal(result.shippingDiscountAmount, 120);
  assert.equal(result.totalDiscountAmount, 220);
  assert.equal(result.total, 900);
  assert.equal(result.appliedPromotions.length, 2);
});

test('central evaluator keeps only the higher priority discount when two promotions hit the same item', async () => {
  const promotions = [
    buildPromotion({
      applicableOn: PROMOTION_APPLICABLE_ON.SPECIFIC_PRODUCTS,
      discountValue: 20,
      priority: 30,
      productIds: ['6870c14d5d3b59cfd5a00191'],
      title: 'Higher Priority',
      type: PROMOTION_TYPE.PRODUCT_DISCOUNT,
    }),
    buildPromotion({
      applicableOn: PROMOTION_APPLICABLE_ON.SPECIFIC_PRODUCTS,
      discountValue: 10,
      priority: 10,
      productIds: ['6870c14d5d3b59cfd5a00191'],
      title: 'Lower Priority',
      type: PROMOTION_TYPE.PRODUCT_DISCOUNT,
    }),
  ];
  const context = buildContext({
    items: [
      {
        categoryId: '6870c14d5d3b59cfd5a00091',
        lineSubtotal: 1000,
        productId: '6870c14d5d3b59cfd5a00191',
        quantity: 1,
        unitPrice: 1000,
      },
    ],
    subtotal: 1000,
  });

  const result = await evaluatePromotions({
    context,
    promotions,
    usageSummary: emptyUsageSummary,
  });

  assert.equal(result.productDiscountAmount, 200);
  assert.equal(result.appliedPromotions.length, 1);
  assert.equal(result.appliedPromotions[0].title, 'Higher Priority');
});

test('central evaluator returns a rejected coupon reason when coupon is not found', async () => {
  const promotions = [
    buildPromotion({
      discountValue: 10,
      title: 'Automatic',
      type: PROMOTION_TYPE.PERCENTAGE_DISCOUNT,
    }),
  ];
  const context = buildContext({
    couponCode: 'SAVE99',
    items: [
      {
        categoryId: '6870c14d5d3b59cfd5a00101',
        lineSubtotal: 500,
        productId: '6870c14d5d3b59cfd5a00201',
        quantity: 1,
        unitPrice: 500,
      },
    ],
    subtotal: 500,
  });

  const result = await evaluatePromotions({
    context,
    promotions,
    usageSummary: emptyUsageSummary,
  });

  assert.equal(result.rejectedCoupon.code, 'SAVE99');
  assert.equal(result.rejectedCoupon.reason, 'Invalid coupon code');
});
