import {
  assertArrayField,
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

const productFields = [
  'name',
  'slug',
  'description',
  'shortDescription',
  'metaTitle',
  'metaDescription',
  'seo',
  'categoryId',
  'basePrice',
  'salePrice',
  'sku',
  'hasVariants',
  'images',
  'status',
  'isFeatured',
  'tags',
  'attributes',
  'shipping',
];

const optionFields = ['name', 'optionType', 'displayStyle', 'sizeGuideImageUrl', 'sortOrder', 'values'];
const optionValueFields = ['value', 'label', 'colorHex', 'sortOrder'];
const variantFields = ['sku', 'optionValues', 'price', 'salePrice', 'images', 'shipping', 'isActive'];

const validateProductPayload = (value, { requireCreateFields = false, requireAny = false } = {}) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, productFields);

  if (requireCreateFields) {
    assertRequiredKeys(payload, ['name', 'categoryId', 'basePrice', 'sku']);
  }

  if (requireAny) {
    assertAtLeastOneKey(payload, productFields);
  }

  ['name', 'slug', 'description', 'shortDescription', 'metaTitle', 'metaDescription', 'categoryId', 'sku', 'status']
    .forEach((field) => assertStringLikeField(payload, field));
  ['basePrice', 'salePrice'].forEach((field) => assertNumberLikeField(payload, field));
  ['hasVariants', 'isFeatured'].forEach((field) => assertBooleanField(payload, field));
  ['images', 'tags', 'attributes'].forEach((field) => assertArrayField(payload, field));
  ['seo', 'shipping'].forEach((field) => assertObjectField(payload, field));

  return pickAllowedKeys(payload, productFields);
};

const validateOptionPayload = (value, { requireName = false, requireAny = false } = {}) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, optionFields);

  if (requireName) {
    assertRequiredKeys(payload, ['name']);
  }

  if (requireAny) {
    assertAtLeastOneKey(payload, optionFields);
  }

  ['name', 'optionType', 'displayStyle', 'sizeGuideImageUrl'].forEach((field) => assertStringLikeField(payload, field));
  assertNumberLikeField(payload, 'sortOrder');
  assertArrayField(payload, 'values');

  return pickAllowedKeys(payload, optionFields);
};

const validateOptionValuePayload = (value, { requireValue = false, requireAny = false } = {}) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, optionValueFields);

  if (requireValue) {
    assertRequiredKeys(payload, ['value']);
  }

  if (requireAny) {
    assertAtLeastOneKey(payload, optionValueFields);
  }

  ['value', 'label', 'colorHex'].forEach((field) => assertStringLikeField(payload, field));
  assertNumberLikeField(payload, 'sortOrder');

  return pickAllowedKeys(payload, optionValueFields);
};

const validateVariantPayload = (value, { requireCreateFields = false, requireAny = false } = {}) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, variantFields);

  if (requireCreateFields) {
    assertRequiredKeys(payload, ['sku', 'optionValues', 'price']);
  }

  if (requireAny) {
    assertAtLeastOneKey(payload, variantFields);
  }

  assertStringLikeField(payload, 'sku');
  assertArrayField(payload, 'optionValues');
  ['price', 'salePrice'].forEach((field) => assertNumberLikeField(payload, field));
  assertArrayField(payload, 'images');
  assertObjectField(payload, 'shipping');
  assertBooleanField(payload, 'isActive');

  return pickAllowedKeys(payload, variantFields);
};

const createProductSchema = createSchema((value) => validateProductPayload(value, { requireCreateFields: true }));
const updateProductSchema = createSchema((value) => validateProductPayload(value, { requireAny: true }));
const createProductOptionSchema = createSchema((value) => validateOptionPayload(value, { requireName: true }));
const updateProductOptionSchema = createSchema((value) => validateOptionPayload(value, { requireAny: true }));
const createProductOptionValueSchema = createSchema((value) => validateOptionValuePayload(value, { requireValue: true }));
const updateProductOptionValueSchema = createSchema((value) => validateOptionValuePayload(value, { requireAny: true }));
const createProductVariantSchema = createSchema((value) => validateVariantPayload(value, { requireCreateFields: true }));
const updateProductVariantSchema = createSchema((value) => validateVariantPayload(value, { requireAny: true }));

export {
  createProductOptionSchema,
  createProductOptionValueSchema,
  createProductSchema,
  createProductVariantSchema,
  updateProductOptionSchema,
  updateProductOptionValueSchema,
  updateProductSchema,
  updateProductVariantSchema,
};
