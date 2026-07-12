import test from 'node:test';
import assert from 'node:assert/strict';

import paymentConfig from '@/config/payment.config.js';
import razorpayProvider from '@/modules/payment/providers/razorpay.provider.js';

test('razorpay fetchPaymentStatus maps failed provider payments', async () => {
  const originalFetch = global.fetch;
  const originalKeyId = paymentConfig.razorpay.keyId;
  const originalKeySecret = paymentConfig.razorpay.keySecret;

  paymentConfig.razorpay.keyId = 'rzp_test_key';
  paymentConfig.razorpay.keySecret = 'rzp_test_secret';
  global.fetch = async () => ({
    ok: true,
    text: async () => JSON.stringify({
      items: [
        {
          created_at: 1710000000,
          error_description: 'Insufficient funds',
          id: 'pay_test_failed',
          method: 'upi',
          order_id: 'order_test_failed',
          status: 'failed',
        },
      ],
    }),
  });

  try {
    const result = await razorpayProvider.fetchPaymentStatus({
      paymentAttempt: {
        providerOrderId: 'order_test_failed',
      },
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.paymentMethod, 'upi');
    assert.equal(result.providerPaymentId, 'pay_test_failed');
    assert.equal(result.failureReason, 'Insufficient funds');
  } finally {
    global.fetch = originalFetch;
    paymentConfig.razorpay.keyId = originalKeyId;
    paymentConfig.razorpay.keySecret = originalKeySecret;
  }
});
