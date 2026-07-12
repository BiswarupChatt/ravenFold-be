import {
  assertAtLeastOneKey,
  assertBooleanField,
  assertNoUnknownKeys,
  assertNumberLikeField,
  assertObjectField,
  assertRequiredKeys,
  assertStringLikeField,
  createSchema,
  expectObject,
  pickAllowedKeys,
} from '@/common/utils/request-schema.util.js';

const pickupLocationFields = [
  'addressLine1',
  'addressLine2',
  'city',
  'code',
  'country',
  'isActive',
  'name',
  'phone',
  'pickupLocation',
  'pincode',
  'state',
];

const providerOrderFields = [
  'provider',
  'pickupLocationId',
  'pickupLocation',
  'pickupAddress',
  'boxType',
  'length',
  'breadth',
  'height',
  'weight',
  'note',
  'notes',
];

const validatePickupLocationPayload = (value, { requireName = false, requireAny = false } = {}) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, pickupLocationFields);

  if (requireName) {
    assertRequiredKeys(payload, ['name']);
  }

  if (requireAny) {
    assertAtLeastOneKey(payload, pickupLocationFields);
  }

  ['addressLine1', 'addressLine2', 'city', 'code', 'country', 'name', 'phone', 'pickupLocation', 'pincode', 'state']
    .forEach((field) => assertStringLikeField(payload, field));
  assertBooleanField(payload, 'isActive');

  return pickAllowedKeys(payload, pickupLocationFields);
};

const createPickupLocationSchema = createSchema((value) => validatePickupLocationPayload(value, { requireName: true }));
const updatePickupLocationSchema = createSchema((value) => validatePickupLocationPayload(value, { requireAny: true }));

const markOrderPackedSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, ['note']);
  assertStringLikeField(payload, 'note');

  return pickAllowedKeys(payload, ['note']);
});

const createProviderOrderSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, providerOrderFields);
  ['provider', 'pickupLocationId', 'pickupLocation', 'boxType', 'note', 'notes'].forEach((field) => assertStringLikeField(payload, field));
  ['length', 'breadth', 'height', 'weight'].forEach((field) => assertNumberLikeField(payload, field));
  assertObjectField(payload, 'pickupAddress');

  return pickAllowedKeys(payload, providerOrderFields);
});

const syncShipmentTrackingSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, ['note']);
  assertStringLikeField(payload, 'note');

  return pickAllowedKeys(payload, ['note']);
});

export {
  createPickupLocationSchema,
  createProviderOrderSchema,
  markOrderPackedSchema,
  syncShipmentTrackingSchema,
  updatePickupLocationSchema,
};
