import test from 'node:test';
import assert from 'node:assert/strict';

import paymentService from '@/modules/payment/services/payment.service.js';

test('payment status data exposes only configured providers', () => {
  const statusData = paymentService.getStatusData();

  assert.deepEqual(statusData.providers, ['razorpay']);
  assert.equal(statusData.defaultProvider, 'razorpay');
});
