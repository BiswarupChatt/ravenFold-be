import { sendSuccess } from '@/common/helpers/response.helper.js';

const getStatusData = () => {
  return {
    module: 'users',
  };
};

const getStatus = async (req, res) => {
  return sendSuccess(res, getStatusData(), 'Users module ready');
};

export { getStatus };

export default {
  getStatus,
};
