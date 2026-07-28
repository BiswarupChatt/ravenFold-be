import { sendSuccess } from '@/common/helpers/response.helper.js';
import announcementBannerService from '@/modules/announcement-banner/services/announcement-banner.service.js';

const listActiveAnnouncementBanners = async (req, res) => {
  return sendSuccess(
    res,
    await announcementBannerService.listActiveAnnouncementBanners(),
    'Active announcement banners fetched',
  );
};

const listAdminAnnouncementBanners = async (req, res) => {
  return sendSuccess(
    res,
    await announcementBannerService.listAdminAnnouncementBanners(req.query),
    'Announcement banners fetched',
  );
};

const getAnnouncementBannerById = async (req, res) => {
  return sendSuccess(
    res,
    await announcementBannerService.getAnnouncementBannerById(req.params.bannerId),
    'Announcement banner fetched',
  );
};

const createAnnouncementBanner = async (req, res) => {
  return sendSuccess(
    res,
    await announcementBannerService.createAnnouncementBanner(req.user, req.body),
    'Announcement banner created',
    201,
  );
};

const updateAnnouncementBanner = async (req, res) => {
  return sendSuccess(
    res,
    await announcementBannerService.updateAnnouncementBanner(req.params.bannerId, req.body),
    'Announcement banner updated',
  );
};

const updateAnnouncementBannerStatus = async (req, res) => {
  return sendSuccess(
    res,
    await announcementBannerService.updateAnnouncementBannerStatus(req.params.bannerId, req.body.isActive),
    'Announcement banner status updated',
  );
};

const deleteAnnouncementBanner = async (req, res) => {
  return sendSuccess(
    res,
    await announcementBannerService.deleteAnnouncementBanner(req.params.bannerId),
    'Announcement banner deleted',
  );
};

export {
  createAnnouncementBanner,
  deleteAnnouncementBanner,
  getAnnouncementBannerById,
  listActiveAnnouncementBanners,
  listAdminAnnouncementBanners,
  updateAnnouncementBanner,
  updateAnnouncementBannerStatus,
};

export default {
  createAnnouncementBanner,
  deleteAnnouncementBanner,
  getAnnouncementBannerById,
  listActiveAnnouncementBanners,
  listAdminAnnouncementBanners,
  updateAnnouncementBanner,
  updateAnnouncementBannerStatus,
};
