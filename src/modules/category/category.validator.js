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

const categoryFields = ['name', 'slug', 'parentCategoryId', 'image', 'isActive'];

const validateCategoryPayload = (value, { requireName = false, requireAny = false } = {}) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, categoryFields);

  if (requireName) {
    assertRequiredKeys(payload, ['name']);
  }

  if (requireAny) {
    assertAtLeastOneKey(payload, categoryFields);
  }

  ['name', 'slug', 'parentCategoryId', 'image'].forEach((field) => assertStringLikeField(payload, field));
  assertBooleanField(payload, 'isActive');

  return pickAllowedKeys(payload, categoryFields);
};

const createCategorySchema = createSchema((value) => validateCategoryPayload(value, { requireName: true }));
const updateCategorySchema = createSchema((value) => validateCategoryPayload(value, { requireAny: true }));

export {
  createCategorySchema,
  updateCategorySchema,
};
