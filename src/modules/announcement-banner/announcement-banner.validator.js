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

const announcementBannerFields = [
  'backgroundColor',
  'ctaLabel',
  'ctaUrl',
  'endDate',
  'isActive',
  'isDismissible',
  'message',
  'placement',
  'priority',
  'startDate',
  'textColor',
  'title',
  'variant',
];

const validateAnnouncementBannerPayload = (
  value,
  { requireMessage = false, requireAny = false } = {},
) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, announcementBannerFields);

  if (requireMessage) {
    assertRequiredKeys(payload, ['message']);
  }

  if (requireAny) {
    assertAtLeastOneKey(payload, announcementBannerFields);
  }

  [
    'backgroundColor',
    'ctaLabel',
    'ctaUrl',
    'endDate',
    'message',
    'placement',
    'startDate',
    'textColor',
    'title',
    'variant',
  ].forEach((field) => assertStringLikeField(payload, field));

  ['isActive', 'isDismissible'].forEach((field) => assertBooleanField(payload, field));
  assertNumberLikeField(payload, 'priority');

  return pickAllowedKeys(payload, announcementBannerFields);
};

const createAnnouncementBannerSchema = createSchema((value) => (
  validateAnnouncementBannerPayload(value, { requireMessage: true })
));
const updateAnnouncementBannerSchema = createSchema((value) => (
  validateAnnouncementBannerPayload(value, { requireAny: true })
));
const updateAnnouncementBannerStatusSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, ['isActive']);
  assertRequiredKeys(payload, ['isActive']);
  assertBooleanField(payload, 'isActive');

  return pickAllowedKeys(payload, ['isActive']);
});

export {
  createAnnouncementBannerSchema,
  updateAnnouncementBannerSchema,
  updateAnnouncementBannerStatusSchema,
};
