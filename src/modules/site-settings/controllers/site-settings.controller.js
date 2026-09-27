import { sendSuccess } from '@/common/helpers/response.helper.js';
import siteSettingsService from '@/modules/site-settings/services/site-settings.service.js';

const getPublicSiteSettings = async (req, res) => {
  return sendSuccess(
    res,
    await siteSettingsService.getPublicSiteSettings(),
    'Site settings fetched',
  );
};

const getAdminSiteSettings = async (req, res) => {
  return sendSuccess(
    res,
    await siteSettingsService.getAdminSiteSettings(),
    'Site settings fetched',
  );
};

const updateSiteSettings = async (req, res) => {
  return sendSuccess(
    res,
    await siteSettingsService.updateSiteSettings(req.user, req.body),
    'Site settings updated',
  );
};

export {
  getAdminSiteSettings,
  getPublicSiteSettings,
  updateSiteSettings,
};

export default {
  getAdminSiteSettings,
  getPublicSiteSettings,
  updateSiteSettings,
};
