import {
  assertAtLeastOneKey,
  assertBooleanField,
  assertNoUnknownKeys,
  assertRequiredKeys,
  assertStringLikeField,
  createSchema,
  expectObject,
  pickAllowedKeys,
} from '@/common/utils/request-schema.util.js';

const updateUserFields = ['name', 'email', 'phone', 'avatar', 'gender', 'dob'];
const addressFields = [
  'fullName',
  'phone',
  'addressLine1',
  'addressLine2',
  'city',
  'state',
  'pincode',
  'country',
  'isDefault',
  'addressType',
];

const updateUserSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, updateUserFields);
  assertAtLeastOneKey(payload, updateUserFields);
  updateUserFields.forEach((field) => assertStringLikeField(payload, field));

  return pickAllowedKeys(payload, updateUserFields);
});

const validateAddressPayload = (value, { requireCreateFields = false, requireAny = false } = {}) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, addressFields);

  if (requireCreateFields) {
    assertRequiredKeys(payload, ['fullName', 'phone', 'addressLine1', 'city', 'state', 'pincode', 'country']);
  }

  if (requireAny) {
    assertAtLeastOneKey(payload, addressFields);
  }

  ['fullName', 'phone', 'addressLine1', 'addressLine2', 'city', 'state', 'pincode', 'country', 'addressType']
    .forEach((field) => assertStringLikeField(payload, field));
  assertBooleanField(payload, 'isDefault');

  return pickAllowedKeys(payload, addressFields);
};

const createAddressSchema = createSchema((value) => validateAddressPayload(value, { requireCreateFields: true }));
const updateAddressSchema = createSchema((value) => validateAddressPayload(value, { requireAny: true }));

export {
  createAddressSchema,
  updateAddressSchema,
  updateUserSchema,
};
