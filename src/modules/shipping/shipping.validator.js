import {
  assertNoUnknownKeys,
  assertNumberLikeField,
  assertObjectField,
  assertStringLikeField,
  createSchema,
  expectObject,
  pickAllowedKeys,
} from '@/common/utils/request-schema.util.js';

const providerOrderFields = [
  'provider',
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

const markOrderPackedSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, ['note']);
  assertStringLikeField(payload, 'note');

  return pickAllowedKeys(payload, ['note']);
});

const createProviderOrderSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, providerOrderFields);
  ['provider', 'pickupLocation', 'boxType', 'note', 'notes'].forEach((field) => assertStringLikeField(payload, field));
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
  createProviderOrderSchema,
  markOrderPackedSchema,
  syncShipmentTrackingSchema,
};
