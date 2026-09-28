import {
  assertAtLeastOneKey,
  assertBooleanField,
  assertImageAssetField,
  assertNoUnknownKeys,
  assertNumberLikeField,
  assertRequiredKeys,
  assertStringLikeField,
  createSchema,
  expectObject,
  pickAllowedKeys,
} from '@/common/utils/request-schema.util.js';

const popupCampaignFields = [
  'ctaLabel', 'ctaUrl', 'customerTarget', 'description', 'deviceTarget', 'displayDelaySeconds', 'displayMode',
  'endDate', 'fallbackLabel', 'image', 'isActive', 'isDismissible', 'priority',
  'pageTarget', 'repeatAfterDays', 'showEmailInput', 'startDate', 'successMessage', 'title',
];

const validatePopupCampaignPayload = (value, { requireTitle = false, requireAny = false } = {}) => {
  const payload = expectObject(value);
  assertNoUnknownKeys(payload, popupCampaignFields);
  if (requireTitle) assertRequiredKeys(payload, ['title']);
  if (requireAny) assertAtLeastOneKey(payload, popupCampaignFields);
  [
    'ctaLabel', 'ctaUrl', 'customerTarget', 'description', 'deviceTarget', 'displayMode', 'endDate',
    'fallbackLabel', 'pageTarget', 'startDate', 'successMessage', 'title',
  ].forEach((field) => assertStringLikeField(payload, field));
  ['isActive', 'isDismissible', 'showEmailInput'].forEach((field) => assertBooleanField(payload, field));
  ['displayDelaySeconds', 'priority', 'repeatAfterDays'].forEach((field) => assertNumberLikeField(payload, field));
  assertImageAssetField(payload, 'image');
  return pickAllowedKeys(payload, popupCampaignFields);
};

const createPopupCampaignSchema = createSchema((value) => validatePopupCampaignPayload(value, { requireTitle: true }));
const updatePopupCampaignSchema = createSchema((value) => validatePopupCampaignPayload(value, { requireAny: true }));
const updatePopupCampaignStatusSchema = createSchema((value) => {
  const payload = expectObject(value);
  assertNoUnknownKeys(payload, ['isActive']);
  assertRequiredKeys(payload, ['isActive']);
  assertBooleanField(payload, 'isActive');
  return pickAllowedKeys(payload, ['isActive']);
});

export {
  createPopupCampaignSchema,
  updatePopupCampaignSchema,
  updatePopupCampaignStatusSchema,
};
