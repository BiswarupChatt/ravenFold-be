import ApiError from '@/common/errors/api.error.js';
import {
  assertDatabaseReady,
  hasOwn,
  normalizeBoolean,
  normalizeObjectId,
  normalizeText,
} from '@/common/utils/service.util.js';
import SiteSettings from '@/modules/site-settings/models/site-settings.model.js';

const SITE_SETTINGS_KEY = 'default';

const defaultSettings = {
  brandName: 'Raven Fold',
  copyrightText: '',
  contact: {
    businessHours: 'Mon - Sat, 9:00 AM - 6:00 PM',
    supportEmail: 'support@ravenfold.com',
    supportPhone: '',
    whatsappNumber: '917439042753',
  },
  featureFlags: {
    enableReviews: true,
    enableWishlist: true,
    maintenanceMode: false,
    showBlog: false,
    showNavbarSearch: false,
  },
  favicon: null,
  logo: null,
  seo: {
    description: 'Thoughtful carry goods from Raven Fold.',
    title: 'Raven Fold',
  },
  socialLinks: [
    { isActive: true, label: 'Instagram', url: 'https://www.instagram.com/' },
    { isActive: true, label: 'Facebook', url: 'https://www.facebook.com/' },
    { isActive: true, label: 'LinkedIn', url: 'https://www.linkedin.com/' },
    { isActive: true, label: 'YouTube', url: 'https://www.youtube.com/' },
  ],
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

const normalizeImageAsset = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const url = normalizeText(value.url);

  if (!url) {
    return null;
  }

  return {
    alt: normalizeText(value.alt),
    publicId: normalizeText(value.publicId),
    url,
  };
};

const normalizeSocialLinks = (value) => {
  if (!Array.isArray(value)) {
    throw new ApiError(400, 'socialLinks must be an array');
  }

  return value
    .map((link) => ({
      isActive: hasOwn(link || {}, 'isActive') ? normalizeBoolean(link.isActive, 'socialLinks.isActive') : true,
      label: normalizeText(link?.label),
      url: normalizeText(link?.url),
    }))
    .filter((link) => link.label || link.url);
};

const formatImageAsset = (asset) => {
  if (!asset?.url) {
    return null;
  }

  return {
    alt: asset.alt || '',
    publicId: asset.publicId || '',
    url: asset.url || '',
  };
};

const formatSiteSettings = (settings = {}) => ({
  id: settings.id || settings._id?.toString?.() || '',
  brandName: settings.brandName || defaultSettings.brandName,
  contact: {
    businessHours: settings.contact?.businessHours || '',
    supportEmail: settings.contact?.supportEmail || '',
    supportPhone: settings.contact?.supportPhone || '',
    whatsappNumber: settings.contact?.whatsappNumber || '',
  },
  copyrightText: settings.copyrightText || '',
  featureFlags: {
    enableReviews: settings.featureFlags?.enableReviews !== false,
    enableWishlist: settings.featureFlags?.enableWishlist !== false,
    maintenanceMode: Boolean(settings.featureFlags?.maintenanceMode),
    showBlog: Boolean(settings.featureFlags?.showBlog),
    showNavbarSearch: Boolean(settings.featureFlags?.showNavbarSearch),
  },
  favicon: formatImageAsset(settings.favicon),
  logo: formatImageAsset(settings.logo),
  seo: {
    description: settings.seo?.description || '',
    title: settings.seo?.title || '',
  },
  socialLinks: Array.isArray(settings.socialLinks)
    ? settings.socialLinks.map((link) => ({
      isActive: link.isActive !== false,
      label: link.label || '',
      url: link.url || '',
    }))
    : [],
  updatedAt: settings.updatedAt || null,
  updatedBy: settings.updatedBy?.toString?.() || null,
});

const getOrCreateSiteSettingsDocument = async () => {
  assertDatabaseReady();

  return SiteSettings.findOneAndUpdate(
    { key: SITE_SETTINGS_KEY },
    { $setOnInsert: { key: SITE_SETTINGS_KEY, ...defaultSettings } },
    { new: true, upsert: true },
  ).exec();
};

const buildSiteSettingsPayload = (payload = {}) => {
  const settingsPayload = {};

  if (hasOwn(payload, 'brandName')) {
    settingsPayload.brandName = normalizeText(payload.brandName) || defaultSettings.brandName;
  }

  if (hasOwn(payload, 'copyrightText')) {
    settingsPayload.copyrightText = normalizeText(payload.copyrightText);
  }

  if (hasOwn(payload, 'logo')) {
    settingsPayload.logo = normalizeImageAsset(payload.logo);
  }

  if (hasOwn(payload, 'favicon')) {
    settingsPayload.favicon = normalizeImageAsset(payload.favicon);
  }

  if (hasOwn(payload, 'contact')) {
    settingsPayload.contact = {
      businessHours: normalizeText(payload.contact?.businessHours),
      supportEmail: normalizeText(payload.contact?.supportEmail).toLowerCase(),
      supportPhone: normalizeText(payload.contact?.supportPhone),
      whatsappNumber: normalizeText(payload.contact?.whatsappNumber),
    };
  }

  if (hasOwn(payload, 'seo')) {
    settingsPayload.seo = {
      description: normalizeText(payload.seo?.description),
      title: normalizeText(payload.seo?.title),
    };
  }

  if (hasOwn(payload, 'featureFlags')) {
    settingsPayload.featureFlags = {
      enableReviews: hasOwn(payload.featureFlags || {}, 'enableReviews')
        ? normalizeBoolean(payload.featureFlags.enableReviews, 'featureFlags.enableReviews')
        : true,
      enableWishlist: hasOwn(payload.featureFlags || {}, 'enableWishlist')
        ? normalizeBoolean(payload.featureFlags.enableWishlist, 'featureFlags.enableWishlist')
        : true,
      maintenanceMode: hasOwn(payload.featureFlags || {}, 'maintenanceMode')
        ? normalizeBoolean(payload.featureFlags.maintenanceMode, 'featureFlags.maintenanceMode')
        : false,
      showBlog: hasOwn(payload.featureFlags || {}, 'showBlog')
        ? normalizeBoolean(payload.featureFlags.showBlog, 'featureFlags.showBlog')
        : false,
      showNavbarSearch: hasOwn(payload.featureFlags || {}, 'showNavbarSearch')
        ? normalizeBoolean(payload.featureFlags.showNavbarSearch, 'featureFlags.showNavbarSearch')
        : false,
    };
  }

  if (hasOwn(payload, 'socialLinks')) {
    settingsPayload.socialLinks = normalizeSocialLinks(payload.socialLinks);
  }

  return settingsPayload;
};

const getPublicSiteSettings = async () => {
  const settings = await getOrCreateSiteSettingsDocument();
  const formattedSettings = formatSiteSettings(settings.toObject());

  return {
    ...formattedSettings,
    socialLinks: formattedSettings.socialLinks.filter((link) => link.isActive && link.url),
  };
};

const getAdminSiteSettings = async () => {
  const settings = await getOrCreateSiteSettingsDocument();

  return formatSiteSettings(settings.toObject());
};

const updateSiteSettings = async (actor, payload = {}) => {
  const actorId = normalizeUserId(actor);
  const settings = await getOrCreateSiteSettingsDocument();
  const settingsPayload = buildSiteSettingsPayload(payload);

  Object.assign(settings, settingsPayload, { updatedBy: actorId });
  await settings.save();

  return formatSiteSettings(settings.toObject());
};

export {
  buildSiteSettingsPayload,
  defaultSettings,
  formatSiteSettings,
  getAdminSiteSettings,
  getPublicSiteSettings,
  updateSiteSettings,
};

export default {
  buildSiteSettingsPayload,
  defaultSettings,
  formatSiteSettings,
  getAdminSiteSettings,
  getPublicSiteSettings,
  updateSiteSettings,
};
