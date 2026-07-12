import {
  assertNoUnknownKeys,
  assertObjectField,
  assertRequiredKeys,
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
const recordPaymentFailureFields = [
  'failureReason',
  'metadata',
  'paymentMethod',
  'providerOrderId',
  'providerPaymentId',
  'status',
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

const recordPaymentAttemptFailureSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, recordPaymentFailureFields);
  assertRequiredKeys(payload, ['status']);
  ['failureReason', 'paymentMethod', 'providerOrderId', 'providerPaymentId', 'status']
    .forEach((field) => assertStringLikeField(payload, field));
  assertObjectField(payload, 'metadata');

  return pickAllowedKeys(payload, recordPaymentFailureFields);
});

export {
  createPaymentSessionSchema,
  recordPaymentAttemptFailureSchema,
  verifyPaymentAttemptSchema,
};
