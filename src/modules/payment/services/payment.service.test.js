import test from 'node:test';
import assert from 'node:assert/strict';

import { assertStorefrontCheckoutSupport } from '@/modules/payment/services/payment.service.js';

test('storefront payment support blocks unsupported providers', () => {
  assert.throws(
    () => assertStorefrontCheckoutSupport('juspay'),
    (error) => {
      assert.equal(error.statusCode, 503);
      assert.match(error.message, /Juspay checkout is not enabled/i);
      return true;
    },
  );

  assert.doesNotThrow(() => assertStorefrontCheckoutSupport('razorpay'));
});
