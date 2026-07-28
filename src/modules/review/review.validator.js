import {
  assertArrayField,
  assertAtLeastOneKey,
  assertImageAssetArrayField,
  assertNoUnknownKeys,
  assertRequiredKeys,
  assertStringLikeField,
  createSchema,
  expectObject,
  pickAllowedKeys,
} from '@/common/utils/request-schema.util.js';

const createReviewFields = [
  'orderId',
  'orderItemId',
  'productId',
  'variantId',
  'rating',
  'title',
  'comment',
  'images',
];

const updateReviewFields = [
  'rating',
  'title',
  'comment',
  'images',
];

const moderationFields = ['adminNote'];

const validateCreateReviewPayload = (value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, createReviewFields);
  assertRequiredKeys(payload, ['orderId', 'orderItemId', 'productId', 'rating', 'comment']);
  ['orderId', 'orderItemId', 'productId', 'variantId', 'rating', 'title', 'comment'].forEach((field) => assertStringLikeField(payload, field));
  assertArrayField(payload, 'images');
  assertImageAssetArrayField(payload, 'images');

  return pickAllowedKeys(payload, createReviewFields);
};

const validateUpdateReviewPayload = (value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, updateReviewFields);
  assertAtLeastOneKey(payload, updateReviewFields);
  ['rating', 'title', 'comment'].forEach((field) => assertStringLikeField(payload, field));
  assertArrayField(payload, 'images');
  assertImageAssetArrayField(payload, 'images');

  return pickAllowedKeys(payload, updateReviewFields);
};

const validateModerationPayload = (value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, moderationFields);
  assertStringLikeField(payload, 'adminNote');

  return pickAllowedKeys(payload, moderationFields);
};

const createReviewSchema = createSchema(validateCreateReviewPayload);
const updateReviewSchema = createSchema(validateUpdateReviewPayload);
const moderationSchema = createSchema(validateModerationPayload);

export {
  createReviewSchema,
  moderationSchema,
  updateReviewSchema,
};
