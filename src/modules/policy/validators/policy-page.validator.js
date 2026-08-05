import {
  assertAtLeastOneKey,
  assertBooleanField,
  assertNoUnknownKeys,
  assertObjectField,
  assertRequiredKeys,
  assertStringLikeField,
  createSchema,
  expectObject,
  pickAllowedKeys,
} from '@/common/utils/request-schema.util.js';

const policyPageFields = [
  'title',
  'slug',
  'contentHtml',
  'status',
  'effectiveDate',
  'seo',
  'showInFooter',
  'footerLabel',
  'footerSortOrder',
];

const policyPageUpdateFields = [
  ...policyPageFields,
  'confirmSystemPolicyChange',
];

const validateSeoPayload = (payload = {}) => {
  if (!Object.prototype.hasOwnProperty.call(payload, 'seo')) {
    return;
  }

  assertObjectField(payload, 'seo');
  assertNoUnknownKeys(payload.seo, ['title', 'description'], 'body.seo');
  ['title', 'description'].forEach((field) => assertStringLikeField(payload.seo, field, 'body.seo'));
};

const validatePolicyPagePayload = (value, { requireCreateFields = false, requireAny = false } = {}) => {
  const payload = expectObject(value);
  const allowedFields = requireCreateFields ? policyPageFields : policyPageUpdateFields;

  assertNoUnknownKeys(payload, allowedFields);

  if (requireCreateFields) {
    assertRequiredKeys(payload, ['title', 'contentHtml']);
  }

  if (requireAny) {
    assertAtLeastOneKey(payload, allowedFields);
  }

  ['title', 'slug', 'contentHtml', 'status', 'effectiveDate', 'footerLabel', 'footerSortOrder'].forEach((field) => (
    assertStringLikeField(payload, field)
  ));
  assertBooleanField(payload, 'showInFooter');
  assertBooleanField(payload, 'confirmSystemPolicyChange');
  validateSeoPayload(payload);

  return pickAllowedKeys(payload, allowedFields);
};

const publishPolicyPageSchema = createSchema((value) => {
  const payload = expectObject(value || {});

  assertNoUnknownKeys(payload, ['effectiveDate']);
  assertStringLikeField(payload, 'effectiveDate');

  return pickAllowedKeys(payload, ['effectiveDate']);
});

const createPolicyPageSchema = createSchema((value) => (
  validatePolicyPagePayload(value, { requireCreateFields: true })
));
const updatePolicyPageSchema = createSchema((value) => (
  validatePolicyPagePayload(value, { requireAny: true })
));

export {
  createPolicyPageSchema,
  publishPolicyPageSchema,
  updatePolicyPageSchema,
};
