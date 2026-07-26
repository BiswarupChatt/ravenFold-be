import assert from 'node:assert/strict';
import test from 'node:test';

import { SHIPPING_GST_TREATMENTS, SUPPLY_TYPES } from '@/modules/gst/gst.constants.js';
import { calculateOrderGst } from '@/modules/gst/services/gst-calculation.service.js';

const baseConfig = {
  defaultGstRate: 18,
  registeredAddress: {
    state: 'West Bengal',
    stateCode: '19',
  },
  shippingGstRate: 18,
  shippingGstTreatment: SHIPPING_GST_TREATMENTS.TAXABLE,
};

const makeItem = (overrides = {}) => ({
  gstSnapshot: {
    cessRate: 0,
    cgstRate: 9,
    exempt: false,
    gstRate: 18,
    hsnCode: '4202',
    igstRate: 18,
    pricingMode: 'exclusive',
    sgstRate: 9,
    taxInclusive: false,
  },
  lineTotal: 1000,
  priceAtTime: 1000,
  quantity: 1,
  ...overrides,
});

test('GST calculation handles B2C intra-state order with CGST and SGST', () => {
  const result = calculateOrderGst({
    billingAddress: { state: 'West Bengal', stateCode: '19' },
    config: baseConfig,
    invoiceType: 'b2c',
    items: [makeItem()],
    shippingAddress: { state: 'West Bengal', stateCode: '19' },
  });

  assert.equal(result.supplyType, SUPPLY_TYPES.INTRA_STATE);
  assert.equal(result.totals.totalTaxableValue, 1000);
  assert.equal(result.totals.totalCgst, 90);
  assert.equal(result.totals.totalSgst, 90);
  assert.equal(result.totals.totalIgst, 0);
  assert.equal(result.totals.grandTotal, 1180);
});

test('GST calculation handles B2B inter-state order with IGST only', () => {
  const result = calculateOrderGst({
    billingAddress: { state: 'Maharashtra', stateCode: '27' },
    config: baseConfig,
    invoiceType: 'b2b',
    items: [makeItem()],
    shippingAddress: { state: 'Maharashtra', stateCode: '27' },
  });

  assert.equal(result.supplyType, SUPPLY_TYPES.INTER_STATE);
  assert.equal(result.totals.totalCgst, 0);
  assert.equal(result.totals.totalSgst, 0);
  assert.equal(result.totals.totalIgst, 180);
  assert.equal(result.totals.grandTotal, 1180);
});

test('GST calculation backs tax out of GST-inclusive product pricing', () => {
  const result = calculateOrderGst({
    billingAddress: { state: 'West Bengal', stateCode: '19' },
    config: baseConfig,
    invoiceType: 'b2c',
    items: [makeItem({
      gstSnapshot: {
        ...makeItem().gstSnapshot,
        pricingMode: 'inclusive',
        taxInclusive: true,
      },
      lineTotal: 1180,
      priceAtTime: 1180,
    })],
    shippingAddress: { state: 'West Bengal', stateCode: '19' },
  });

  assert.equal(result.totals.totalTaxableValue, 1000);
  assert.equal(result.totals.totalGst, 180);
  assert.equal(result.totals.grandTotal, 1180);
});

test('GST calculation allocates discounts and taxes shipping separately', () => {
  const result = calculateOrderGst({
    billingAddress: { state: 'West Bengal', stateCode: '19' },
    config: baseConfig,
    invoiceType: 'b2c',
    items: [
      makeItem({ lineTotal: 1000, priceAtTime: 1000 }),
      makeItem({
        gstSnapshot: {
          ...makeItem().gstSnapshot,
          cgstRate: 2.5,
          gstRate: 5,
          igstRate: 5,
          sgstRate: 2.5,
        },
        lineTotal: 500,
        priceAtTime: 500,
      }),
    ],
    productDiscountAmount: 150,
    shippingAddress: { state: 'West Bengal', stateCode: '19' },
    shippingCharge: 100,
  });

  assert.equal(result.items[0].discountAmount, 100);
  assert.equal(result.items[1].discountAmount, 50);
  assert.equal(result.shipping.taxableValue, 84.75);
  assert.equal(result.shipping.totalTax, 15.25);
  assert.equal(result.totals.grandTotal, 1634.5);
});
