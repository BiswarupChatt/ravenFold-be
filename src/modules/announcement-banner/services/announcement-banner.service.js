import ApiError from '@/common/errors/api.error.js';
import { getPagination } from '@/common/utils/pagination.util.js';
import {
  assertDatabaseReady,
  hasOwn,
  normalizeBoolean,
  normalizeObjectId,
  normalizeText,
} from '@/common/utils/service.util.js';
import AnnouncementBanner, {
  ANNOUNCEMENT_BANNER_PLACEMENT,
  ANNOUNCEMENT_BANNER_VARIANT,
  CAMPAIGN_CUSTOMER_TARGET,
  CAMPAIGN_DEVICE_TARGET,
  CAMPAIGN_PAGE_TARGET,
  announcementBannerPlacements,
  announcementBannerVariants,
  campaignCustomerTargets,
  campaignDeviceTargets,
  campaignPageTargets,
} from '@/modules/announcement-banner/models/announcement-banner.model.js';

const editableAnnouncementBannerFields = [
  'backgroundColor',
  'ctaLabel',
  'ctaUrl',
  'customerTarget',
  'deviceTarget',
  'endDate',
  'isActive',
  'isDismissible',
  'message',
  'pageTarget',
  'placement',
  'priority',
  'startDate',
  'textColor',
  'title',
  'variant',
];

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

const buildActiveBannerQuery = (now = new Date(), context = {}) => {
  const normalizedContext = normalizeActiveContext(context);

  return ({
  isActive: true,
  placement: ANNOUNCEMENT_BANNER_PLACEMENT.TOP_NAVBAR,
  $and: [
    {
      $or: [
        { startDate: null },
        { startDate: { $exists: false } },
        { startDate: { $lte: now } },
      ],
    },
    {
      $or: [
        { endDate: null },
        { endDate: { $exists: false } },
        { endDate: { $gte: now } },
      ],
    },
    buildTargetMatch('deviceTarget', normalizedContext.deviceTarget, CAMPAIGN_DEVICE_TARGET.ALL),
    buildTargetMatch('pageTarget', normalizedContext.pageTarget, CAMPAIGN_PAGE_TARGET.ALL),
    buildTargetMatch('customerTarget', normalizedContext.customerTarget, CAMPAIGN_CUSTOMER_TARGET.ALL),
  ],
  });
};

const normalizeUserId = (actor = null) => {
  try {
    if (!actor?.id) {
      throw new Error('Missing actor id');
    }

    return normalizeObjectId(actor.id, 'authenticated user');
  } catch {
    throw new ApiError(401, 'Authentication required');
  }
};

const normalizeDate = (value, field) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${field} must be a valid date`);
  }

  return date;
};

const normalizeInteger = (value, field) => {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue)) {
    throw new ApiError(400, `${field} must be an integer`);
  }

  return numberValue;
};

const formatAnnouncementBanner = (banner = {}) => ({
  id: banner.id || banner._id?.toString?.() || '',
  backgroundColor: banner.backgroundColor || '',
  ctaLabel: banner.ctaLabel || '',
  ctaUrl: banner.ctaUrl || '',
  endDate: banner.endDate || null,
  customerTarget: banner.customerTarget || CAMPAIGN_CUSTOMER_TARGET.ALL,
  deviceTarget: banner.deviceTarget || CAMPAIGN_DEVICE_TARGET.ALL,
  isActive: Boolean(banner.isActive),
  isDismissible: banner.isDismissible !== false,
  message: banner.message || '',
  pageTarget: banner.pageTarget || CAMPAIGN_PAGE_TARGET.ALL,
  placement: banner.placement || ANNOUNCEMENT_BANNER_PLACEMENT.TOP_NAVBAR,
  priority: Number(banner.priority || 0),
  startDate: banner.startDate || null,
  textColor: banner.textColor || '',
  title: banner.title || '',
  variant: banner.variant || ANNOUNCEMENT_BANNER_VARIANT.DEFAULT,
  createdBy: banner.createdBy?.toString?.() || null,
  createdAt: banner.createdAt || null,
  updatedAt: banner.updatedAt || null,
});

const buildAnnouncementBannerPayload = (payload = {}, { requireMessage = false } = {}) => {
  const bannerPayload = {};

  for (const field of editableAnnouncementBannerFields) {
    if (!hasOwn(payload, field)) {
      continue;
    }

    if (field === 'isActive' || field === 'isDismissible') {
      bannerPayload[field] = normalizeBoolean(payload[field], field);
      continue;
    }

    if (field === 'priority') {
      bannerPayload.priority = normalizeInteger(payload.priority, 'priority');
      continue;
    }

    if (field === 'startDate' || field === 'endDate') {
      bannerPayload[field] = normalizeDate(payload[field], field);
      continue;
    }

    if (field === 'placement') {
      const placement = normalizeText(payload.placement) || ANNOUNCEMENT_BANNER_PLACEMENT.TOP_NAVBAR;

      if (!announcementBannerPlacements.includes(placement)) {
        throw new ApiError(400, 'placement is not supported');
      }

      bannerPayload.placement = placement;
      continue;
    }

    if (field === 'deviceTarget') {
      bannerPayload.deviceTarget = normalizeTarget(payload.deviceTarget, campaignDeviceTargets, CAMPAIGN_DEVICE_TARGET.ALL);
      continue;
    }

    if (field === 'pageTarget') {
      bannerPayload.pageTarget = normalizeTarget(payload.pageTarget, campaignPageTargets, CAMPAIGN_PAGE_TARGET.ALL);
      continue;
    }

    if (field === 'customerTarget') {
      bannerPayload.customerTarget = normalizeTarget(payload.customerTarget, campaignCustomerTargets, CAMPAIGN_CUSTOMER_TARGET.ALL);
      continue;
    }

    if (field === 'variant') {
      const variant = normalizeText(payload.variant) || ANNOUNCEMENT_BANNER_VARIANT.DEFAULT;

      if (!announcementBannerVariants.includes(variant)) {
        throw new ApiError(400, 'variant is not supported');
      }

      bannerPayload.variant = variant;
      continue;
    }

    bannerPayload[field] = normalizeText(payload[field]);
  }

  if (requireMessage && !bannerPayload.message) {
    throw new ApiError(400, 'message is required');
  }

  if (hasOwn(bannerPayload, 'message') && !bannerPayload.message) {
    throw new ApiError(400, 'message cannot be empty');
  }

  if (bannerPayload.startDate && bannerPayload.endDate && bannerPayload.startDate > bannerPayload.endDate) {
    throw new ApiError(400, 'endDate must be greater than or equal to startDate');
  }

  return bannerPayload;
};

const buildAdminBannerFilter = (query = {}) => {
  const filter = {};

  if (hasOwn(query, 'isActive')) {
    filter.isActive = normalizeBoolean(query.isActive, 'isActive');
  }

  if (query.placement && announcementBannerPlacements.includes(query.placement)) {
    filter.placement = query.placement;
  }

  if (query.variant && announcementBannerVariants.includes(query.variant)) {
    filter.variant = query.variant;
  }

  return filter;
};

const getAnnouncementBannerDocument = async (bannerId) => {
  assertDatabaseReady();
  const normalizedBannerId = normalizeObjectId(bannerId, 'announcement banner id');
  const banner = await AnnouncementBanner.findById(normalizedBannerId).exec();

  if (!banner) {
    throw new ApiError(404, 'Announcement banner not found');
  }

  return banner;
};

const listActiveAnnouncementBanners = async ({ now = new Date(), context = {} } = {}) => {
  assertDatabaseReady();

  const banners = await AnnouncementBanner.find(buildActiveBannerQuery(now, context))
    .sort({ priority: -1, createdAt: -1 })
    .lean()
    .exec();

  return banners.map(formatAnnouncementBanner);
};

const listAdminAnnouncementBanners = async (query = {}) => {
  assertDatabaseReady();
  const { limit, page, skip } = getPagination(query);
  const filter = buildAdminBannerFilter(query);
  const [banners, total] = await Promise.all([
    AnnouncementBanner.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    AnnouncementBanner.countDocuments(filter).exec(),
  ]);

  return {
    items: banners.map(formatAnnouncementBanner),
    pagination: {
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
      limit,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getAnnouncementBannerById = async (bannerId) => {
  const banner = await getAnnouncementBannerDocument(bannerId);

  return formatAnnouncementBanner(banner);
};

const createAnnouncementBanner = async (actor, payload = {}) => {
  assertDatabaseReady();
  const actorId = normalizeUserId(actor);
  const bannerPayload = buildAnnouncementBannerPayload(payload, { requireMessage: true });
  const banner = await AnnouncementBanner.create({
    ...bannerPayload,
    createdBy: actorId,
  });

  return formatAnnouncementBanner(banner.toObject());
};

const updateAnnouncementBanner = async (bannerId, payload = {}) => {
  const banner = await getAnnouncementBannerDocument(bannerId);
  const bannerPayload = buildAnnouncementBannerPayload(payload);

  if (Object.keys(bannerPayload).length === 0) {
    throw new ApiError(400, 'No announcement banner fields provided to update');
  }

  Object.assign(banner, bannerPayload);
  await banner.save();

  return formatAnnouncementBanner(banner.toObject());
};

const updateAnnouncementBannerStatus = async (bannerId, isActive) => {
  const banner = await getAnnouncementBannerDocument(bannerId);

  banner.isActive = normalizeBoolean(isActive, 'isActive');
  await banner.save();

  return formatAnnouncementBanner(banner.toObject());
};

const deleteAnnouncementBanner = async (bannerId) => {
  const banner = await getAnnouncementBannerDocument(bannerId);
  const deletedBanner = formatAnnouncementBanner(banner);

  await banner.deleteOne();

  return deletedBanner;
};

export {
  buildActiveBannerQuery,
  createAnnouncementBanner,
  deleteAnnouncementBanner,
  formatAnnouncementBanner,
  getAnnouncementBannerById,
  listActiveAnnouncementBanners,
  listAdminAnnouncementBanners,
  updateAnnouncementBanner,
  updateAnnouncementBannerStatus,
};

export default {
  buildActiveBannerQuery,
  createAnnouncementBanner,
  deleteAnnouncementBanner,
  formatAnnouncementBanner,
  getAnnouncementBannerById,
  listActiveAnnouncementBanners,
  listAdminAnnouncementBanners,
  updateAnnouncementBanner,
  updateAnnouncementBannerStatus,
};
