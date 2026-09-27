import { sendSuccess } from '@/common/helpers/response.helper.js';
import storefrontPageService from '@/modules/storefront-page/services/storefront-page.service.js';

const getPublicHomePage = async (req, res) => sendSuccess(
  res,
  await storefrontPageService.getPublicHomePage(),
  'Homepage fetched',
);

const getAdminHomePage = async (req, res) => sendSuccess(
  res,
  await storefrontPageService.getAdminHomePage(),
  'Homepage fetched',
);

const updateAdminHomePage = async (req, res) => sendSuccess(
  res,
  await storefrontPageService.updateAdminHomePage(req.user, req.body),
  'Homepage updated',
);

export { getAdminHomePage, getPublicHomePage, updateAdminHomePage };
export default { getAdminHomePage, getPublicHomePage, updateAdminHomePage };
