import {
  assertNoUnknownKeys,
  assertRequiredKeys,
  assertStringLikeField,
  createSchema,
  expectObject,
  pickAllowedKeys,
} from '@/common/utils/request-schema.util.js';

const leadFields = ['campaignId', 'email', 'metadata', 'pageUrl', 'source'];

const createLeadSchema = createSchema((value) => {
  const payload = expectObject(value);
  assertNoUnknownKeys(payload, leadFields);
  assertRequiredKeys(payload, ['email']);
  ['campaignId', 'email', 'pageUrl', 'source'].forEach((field) => assertStringLikeField(payload, field));
  return pickAllowedKeys(payload, leadFields);
});

export { createLeadSchema };
