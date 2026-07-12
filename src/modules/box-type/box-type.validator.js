import {
  assertAtLeastOneKey,
  assertBooleanField,
  assertNoUnknownKeys,
  assertNumberLikeField,
  assertRequiredKeys,
  assertStringLikeField,
  createSchema,
  expectObject,
  pickAllowedKeys,
} from '@/common/utils/request-schema.util.js';

const boxTypeFields = ['name', 'code', 'length', 'breadth', 'height', 'weight', 'isActive'];
const measurementFields = ['length', 'breadth', 'height', 'weight'];

const validateBoxTypePayload = (value, { requireCreateFields = false, requireAny = false } = {}) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, boxTypeFields);

  if (requireCreateFields) {
    assertRequiredKeys(payload, ['name', ...measurementFields]);
  }

  if (requireAny) {
    assertAtLeastOneKey(payload, boxTypeFields);
  }

  ['name', 'code'].forEach((field) => assertStringLikeField(payload, field));
  measurementFields.forEach((field) => assertNumberLikeField(payload, field));
  assertBooleanField(payload, 'isActive');

  return pickAllowedKeys(payload, boxTypeFields);
};

const createBoxTypeSchema = createSchema((value) => validateBoxTypePayload(value, { requireCreateFields: true }));
const updateBoxTypeSchema = createSchema((value) => validateBoxTypePayload(value, { requireAny: true }));

export {
  createBoxTypeSchema,
  updateBoxTypeSchema,
};
