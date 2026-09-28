import { sendSuccess } from '@/common/helpers/response.helper.js';
import popupCampaignService from '@/modules/popup-campaign.service.js';

const listActivePopupCampaigns = async (req, res) => sendSuccess(
  res,
  await popupCampaignService.listActivePopupCampaigns({ context: req.query }),
  'Active popup campaigns fetched',
);

const listAdminPopupCampaigns = async (req, res) => sendSuccess(
  res,
  await popupCampaignService.listAdminPopupCampaigns(req.query),
  'Popup campaigns fetched',
);

const createPopupCampaign = async (req, res) => sendSuccess(
  res,
  await popupCampaignService.createPopupCampaign(req.user, req.body),
  'Popup campaign created',
  201,
);

const updatePopupCampaign = async (req, res) => sendSuccess(
  res,
  await popupCampaignService.updatePopupCampaign(req.params.campaignId, req.body),
  'Popup campaign updated',
);

const updatePopupCampaignStatus = async (req, res) => sendSuccess(
  res,
  await popupCampaignService.updatePopupCampaignStatus(req.params.campaignId, req.body.isActive),
  'Popup campaign status updated',
);

const deletePopupCampaign = async (req, res) => sendSuccess(
  res,
  await popupCampaignService.deletePopupCampaign(req.params.campaignId),
  'Popup campaign deleted',
);

export {
  createPopupCampaign,
  deletePopupCampaign,
  listActivePopupCampaigns,
  listAdminPopupCampaigns,
  updatePopupCampaign,
  updatePopupCampaignStatus,
};

export default {
  createPopupCampaign,
  deletePopupCampaign,
  listActivePopupCampaigns,
  listAdminPopupCampaigns,
  updatePopupCampaign,
  updatePopupCampaignStatus,
};
