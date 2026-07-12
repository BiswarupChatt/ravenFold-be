import {
  assertBooleanField,
  assertNoUnknownKeys,
  assertObjectField,
  assertRequiredKeys,
  assertStringLikeField,
  createSchema,
  expectObject,
  pickAllowedKeys,
} from '@/common/utils/request-schema.util.js';

const checkoutFields = ['shippingAddressId', 'billingSameAsShipping', 'billingAddressId', 'billingAddress', 'notes'];
const updateStatusFields = ['status', 'note'];

const createCheckoutOrderSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, checkoutFields);
  assertRequiredKeys(payload, ['shippingAddressId']);
  assertStringLikeField(payload, 'shippingAddressId');
  assertBooleanField(payload, 'billingSameAsShipping');
  assertStringLikeField(payload, 'billingAddressId');
  assertObjectField(payload, 'billingAddress');
  assertStringLikeField(payload, 'notes');

  return pickAllowedKeys(payload, checkoutFields);
});

const updateAdminOrderStatusSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, updateStatusFields);
  assertRequiredKeys(payload, ['status']);
  assertStringLikeField(payload, 'status');
  assertStringLikeField(payload, 'note');

  return pickAllowedKeys(payload, updateStatusFields);
});

export {
  createCheckoutOrderSchema,
  updateAdminOrderStatusSchema,
};
