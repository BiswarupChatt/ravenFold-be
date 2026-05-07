import userService from '@/modules/users/user.service.js';
import { sendSuccess } from '@/common/helpers/response.helper.js';

async function getStatus(req, res) {
  return sendSuccess(res, userService.getStatus(), 'Users module ready');
}

export { getStatus };

export default {
  getStatus,
};