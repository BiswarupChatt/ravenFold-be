import {
  assertAtLeastOneKey,
  assertBooleanField,
  assertImageAssetField,
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

  ['name', 'slug', 'parentCategoryId'].forEach((field) => assertStringLikeField(payload, field));
  assertBooleanField(payload, 'isActive');
  assertImageAssetField(payload, 'image');

  return pickAllowedKeys(payload, categoryFields);
};

const createCategorySchema = createSchema((value) => validateCategoryPayload(value, { requireName: true }));
const updateCategorySchema = createSchema((value) => validateCategoryPayload(value, { requireAny: true }));

export {
  createCategorySchema,
  updateCategorySchema,
};
