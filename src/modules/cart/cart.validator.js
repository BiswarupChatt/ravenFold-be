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

export {
  addCartItemSchema,
  updateCartItemSchema,
};
