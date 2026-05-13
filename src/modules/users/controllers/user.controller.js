import { sendSuccess } from '@/common/helpers/response.helper.js';
import userService from '@/modules/users/services/user.service.js';

const getStatus = async (req, res) => {
  return sendSuccess(res, userService.getStatusData(), 'Users module ready');
};

const getMe = async (req, res) => {
  return sendSuccess(res, await userService.getCurrentUserProfile(req.user), 'User profile fetched');
};

const updateMe = async (req, res) => {
  return sendSuccess(
    res,
    await userService.updateCurrentUserProfile(req.user, req.body),
    'User profile updated',
  );
};

export { getMe, getStatus, updateMe };

export default {
  getMe,
  getStatus,
  updateMe,
};
