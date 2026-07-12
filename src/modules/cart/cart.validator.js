import {
  assertNoUnknownKeys,
  assertNumberLikeField,
  assertRequiredKeys,
  assertStringLikeField,
  createSchema,
  expectObject,
  pickAllowedKeys,
} from '@/common/utils/request-schema.util.js';

const addCartItemFields = ['productId', 'variantId', 'quantity'];
const couponFields = ['couponCode'];

const addCartItemSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, addCartItemFields);
  assertRequiredKeys(payload, ['productId', 'quantity']);
  assertStringLikeField(payload, 'productId');
  assertStringLikeField(payload, 'variantId');
  assertNumberLikeField(payload, 'quantity');

  return pickAllowedKeys(payload, addCartItemFields);
});

const updateCartItemSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, ['quantity']);
  assertRequiredKeys(payload, ['quantity']);
  assertNumberLikeField(payload, 'quantity');

  return pickAllowedKeys(payload, ['quantity']);
});

const calculateCartSchema = createSchema((value) => {
  const payload = value === null || value === undefined ? {} : expectObject(value);

  assertNoUnknownKeys(payload, couponFields);
  assertStringLikeField(payload, 'couponCode');

  return pickAllowedKeys(payload, couponFields);
});

const applyCouponSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, couponFields);
  assertRequiredKeys(payload, ['couponCode']);
  assertStringLikeField(payload, 'couponCode');

  return pickAllowedKeys(payload, couponFields);
});

export {
  addCartItemSchema,
  applyCouponSchema,
  calculateCartSchema,
  updateCartItemSchema,
};
