import { sendSuccess } from '@/common/helpers/response.helper.js';

const getStatusData = () => {
  return {
    module: 'analytics',
  };
};

const getStatus = async (req, res) => {
  return sendSuccess(res, getStatusData(), 'Analytics module ready');
};

export { getStatus };

export default {
  getStatus,
};
