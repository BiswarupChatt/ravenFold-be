import ApiError from '@/common/errors/api.error.js';
import { getPagination } from '@/common/utils/pagination.util.js';
import {
  assertDatabaseReady,
  hasOwn,
  normalizeBoolean,
  normalizeObjectId,
  normalizeText,
} from '@/common/utils/service.util.js';
import PopupCampaign, {
  CAMPAIGN_CUSTOMER_TARGET,
  CAMPAIGN_DEVICE_TARGET,
  CAMPAIGN_PAGE_TARGET,
  POPUP_DISPLAY_MODE,
  campaignCustomerTargets,
  campaignDeviceTargets,
  campaignPageTargets,
  popupDisplayModes,
} from '@/modules/popup-campaign.model.js';

const editablePopupCampaignFields = [
  'ctaLabel', 'ctaUrl', 'customerTarget', 'description', 'deviceTarget', 'displayDelaySeconds', 'displayMode',
  'endDate', 'fallbackLabel', 'image', 'isActive', 'isDismissible', 'priority',
  'pageTarget', 'repeatAfterDays', 'showEmailInput', 'startDate', 'successMessage', 'title',
];

const normalizeUserId = (actor = null) => {
  try {
    if (!actor?.id) throw new Error('Missing actor id');
    return normalizeObjectId(actor.id, 'authenticated user');
  } catch {
    throw new ApiError(401, 'Authentication required');
  }
};

const normalizeDate = (value, field) => {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, `${field} must be a valid date`);
  return date;
};

const normalizeInteger = (value, field, { min = null } = {}) => {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue)) throw new ApiError(400, `${field} must be an integer`);
  if (min !== null && numberValue < min) throw new ApiError(400, `${field} must be greater than or equal to ${min}`);
  return numberValue;
};

const normalizeTarget = (value, supportedValues, fallback) => {
  const normalizedValue = normalizeText(value).toUpperCase();

  return supportedValues.includes(normalizedValue) ? normalizedValue : fallback;
};

const buildTargetMatch = (field, value, allValue) => ({
  $or: [
    { [field]: allValue },
    { [field]: value },
    { [field]: null },
    { [field]: { $exists: false } },
  ],
});

const normalizeActiveContext = (query = {}) => ({
  customerTarget: normalizeTarget(query.customerTarget || query.customer, campaignCustomerTargets, CAMPAIGN_CUSTOMER_TARGET.ALL),
  deviceTarget: normalizeTarget(query.deviceTarget || query.device, campaignDeviceTargets, CAMPAIGN_DEVICE_TARGET.ALL),
  pageTarget: normalizeTarget(query.pageTarget || query.page, campaignPageTargets, CAMPAIGN_PAGE_TARGET.ALL),
});

const normalizeImage = (value) => {
  if (!value) return null;
  return {
    publicId: normalizeText(value.publicId),
    url: normalizeText(value.url),
  };
};

const formatPopupCampaign = (campaign = {}) => ({
  id: campaign.id || campaign._id?.toString?.() || '',
  ctaLabel: campaign.ctaLabel || '',
  ctaUrl: campaign.ctaUrl || '',
  description: campaign.description || '',
  customerTarget: campaign.customerTarget || CAMPAIGN_CUSTOMER_TARGET.ALL,
  deviceTarget: campaign.deviceTarget || CAMPAIGN_DEVICE_TARGET.ALL,
  displayDelaySeconds: Number(campaign.displayDelaySeconds || 0),
  displayMode: campaign.displayMode || POPUP_DISPLAY_MODE.ONCE_PER_SESSION,
  endDate: campaign.endDate || null,
  fallbackLabel: campaign.fallbackLabel || '',
  image: campaign.image || null,
  isActive: Boolean(campaign.isActive),
  isDismissible: campaign.isDismissible !== false,
  priority: Number(campaign.priority || 0),
  pageTarget: campaign.pageTarget || CAMPAIGN_PAGE_TARGET.ALL,
  repeatAfterDays: Number(campaign.repeatAfterDays || 7),
  showEmailInput: Boolean(campaign.showEmailInput),
  startDate: campaign.startDate || null,
  successMessage: campaign.successMessage || '',
  title: campaign.title || '',
  createdBy: campaign.createdBy?.toString?.() || null,
  createdAt: campaign.createdAt || null,
  updatedAt: campaign.updatedAt || null,
});

const buildActiveCampaignQuery = (now = new Date(), context = {}) => {
  const normalizedContext = normalizeActiveContext(context);

  return ({
  isActive: true,
  $and: [
    { $or: [{ startDate: null }, { startDate: { $exists: false } }, { startDate: { $lte: now } }] },
    { $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: now } }] },
    buildTargetMatch('deviceTarget', normalizedContext.deviceTarget, CAMPAIGN_DEVICE_TARGET.ALL),
    buildTargetMatch('pageTarget', normalizedContext.pageTarget, CAMPAIGN_PAGE_TARGET.ALL),
    buildTargetMatch('customerTarget', normalizedContext.customerTarget, CAMPAIGN_CUSTOMER_TARGET.ALL),
  ],
  });
};

const buildPopupCampaignPayload = (payload = {}, { requireTitle = false } = {}) => {
  const campaignPayload = {};
  for (const field of editablePopupCampaignFields) {
    if (!hasOwn(payload, field)) continue;
    if (['isActive', 'isDismissible', 'showEmailInput'].includes(field)) {
      campaignPayload[field] = normalizeBoolean(payload[field], field);
    } else if (field === 'priority') {
      campaignPayload.priority = normalizeInteger(payload.priority, 'priority');
    } else if (field === 'repeatAfterDays') {
      campaignPayload.repeatAfterDays = normalizeInteger(payload.repeatAfterDays, 'repeatAfterDays', { min: 1 });
    } else if (field === 'displayDelaySeconds') {
      campaignPayload.displayDelaySeconds = normalizeInteger(payload.displayDelaySeconds, 'displayDelaySeconds', { min: 0 });
    } else if (field === 'startDate' || field === 'endDate') {
      campaignPayload[field] = normalizeDate(payload[field], field);
    } else if (field === 'displayMode') {
      const displayMode = normalizeText(payload.displayMode) || POPUP_DISPLAY_MODE.ONCE_PER_SESSION;
      if (!popupDisplayModes.includes(displayMode)) throw new ApiError(400, 'displayMode is not supported');
      campaignPayload.displayMode = displayMode;
    } else if (field === 'deviceTarget') {
      campaignPayload.deviceTarget = normalizeTarget(payload.deviceTarget, campaignDeviceTargets, CAMPAIGN_DEVICE_TARGET.ALL);
    } else if (field === 'pageTarget') {
      campaignPayload.pageTarget = normalizeTarget(payload.pageTarget, campaignPageTargets, CAMPAIGN_PAGE_TARGET.ALL);
    } else if (field === 'customerTarget') {
      campaignPayload.customerTarget = normalizeTarget(payload.customerTarget, campaignCustomerTargets, CAMPAIGN_CUSTOMER_TARGET.ALL);
    } else if (field === 'image') {
      campaignPayload.image = normalizeImage(payload.image);
    } else {
      campaignPayload[field] = normalizeText(payload[field]);
    }
  }
  if (requireTitle && !campaignPayload.title) throw new ApiError(400, 'title is required');
  if (hasOwn(campaignPayload, 'title') && !campaignPayload.title) throw new ApiError(400, 'title cannot be empty');
  if (campaignPayload.startDate && campaignPayload.endDate && campaignPayload.startDate > campaignPayload.endDate) {
    throw new ApiError(400, 'endDate must be greater than or equal to startDate');
  }
  return campaignPayload;
};

const getPopupCampaignDocument = async (campaignId) => {
  assertDatabaseReady();
  const campaign = await PopupCampaign.findById(normalizeObjectId(campaignId, 'popup campaign id')).exec();
  if (!campaign) throw new ApiError(404, 'Popup campaign not found');
  return campaign;
};

const listActivePopupCampaigns = async ({ now = new Date(), context = {} } = {}) => {
  assertDatabaseReady();
  const campaigns = await PopupCampaign.find(buildActiveCampaignQuery(now, context)).sort({ priority: -1, createdAt: -1 }).limit(1).lean().exec();
  return campaigns.map(formatPopupCampaign);
};

const listAdminPopupCampaigns = async (query = {}) => {
  assertDatabaseReady();
  const { limit, page, skip } = getPagination(query);
  const filter = {};
  if (hasOwn(query, 'isActive')) filter.isActive = normalizeBoolean(query.isActive, 'isActive');
  const [items, total] = await Promise.all([
    PopupCampaign.find(filter).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
    PopupCampaign.countDocuments(filter).exec(),
  ]);
  return {
    items: items.map(formatPopupCampaign),
    pagination: { hasNextPage: page * limit < total, hasPrevPage: page > 1, limit, page, total, totalPages: Math.ceil(total / limit) },
  };
};

const createPopupCampaign = async (actor, payload = {}) => {
  assertDatabaseReady();
  const campaign = await PopupCampaign.create({ ...buildPopupCampaignPayload(payload, { requireTitle: true }), createdBy: normalizeUserId(actor) });
  return formatPopupCampaign(campaign.toObject());
};

const updatePopupCampaign = async (campaignId, payload = {}) => {
  const campaign = await getPopupCampaignDocument(campaignId);
  const campaignPayload = buildPopupCampaignPayload(payload);
  if (!Object.keys(campaignPayload).length) throw new ApiError(400, 'No popup campaign fields provided to update');
  Object.assign(campaign, campaignPayload);
  await campaign.save();
  return formatPopupCampaign(campaign.toObject());
};

const updatePopupCampaignStatus = async (campaignId, isActive) => {
  const campaign = await getPopupCampaignDocument(campaignId);
  campaign.isActive = normalizeBoolean(isActive, 'isActive');
  await campaign.save();
  return formatPopupCampaign(campaign.toObject());
};

const deletePopupCampaign = async (campaignId) => {
  const campaign = await getPopupCampaignDocument(campaignId);
  const deletedCampaign = formatPopupCampaign(campaign);
  await campaign.deleteOne();
  return deletedCampaign;
};

export {
  createPopupCampaign,
  deletePopupCampaign,
  formatPopupCampaign,
  listActivePopupCampaigns,
  listAdminPopupCampaigns,
  updatePopupCampaign,
  updatePopupCampaignStatus,
};

export default {
  createPopupCampaign,
  deletePopupCampaign,
  formatPopupCampaign,
  listActivePopupCampaigns,
  listAdminPopupCampaigns,
  updatePopupCampaign,
  updatePopupCampaignStatus,
};
