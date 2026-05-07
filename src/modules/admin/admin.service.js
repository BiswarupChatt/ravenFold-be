import { sendSuccess } from '@/common/helpers/response.helper.js';

const getStatusData = () => {
  return {
    module: 'admin',
  };
};

const getStatus = async (req, res) => {
  return sendSuccess(res, getStatusData(), 'Admin module ready');
};

export { getStatus };

export default {
  getStatus,
};
