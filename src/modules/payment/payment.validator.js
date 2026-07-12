import {
  assertNoUnknownKeys,
  assertObjectField,
  assertStringLikeField,
  createSchema,
  expectObject,
  pickAllowedKeys,
} from '@/common/utils/request-schema.util.js';

const createPaymentSessionFields = ['orderId', 'provider', 'idempotencyKey'];
const verifyPaymentFields = [
  'providerOrderId',
  'providerPaymentId',
  'razorpay_order_id',
  'razorpay_payment_id',
  'razorpay_signature',
  'signature',
  'metadata',
];

const createPaymentSessionSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, createPaymentSessionFields);
  assertStringLikeField(payload, 'orderId');
  assertStringLikeField(payload, 'provider');
  assertStringLikeField(payload, 'idempotencyKey');

  return pickAllowedKeys(payload, createPaymentSessionFields);
});

const verifyPaymentAttemptSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, verifyPaymentFields);
  ['providerOrderId', 'providerPaymentId', 'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature', 'signature']
    .forEach((field) => assertStringLikeField(payload, field));
  assertObjectField(payload, 'metadata');

  return pickAllowedKeys(payload, verifyPaymentFields);
});

export {
  createPaymentSessionSchema,
  verifyPaymentAttemptSchema,
};
