import { sendSuccess } from '@/common/helpers/response.helper.js';

const getStatusData = () => {
  return {
    module: 'orders',
  };
};

const getStatus = async (req, res) => {
  return sendSuccess(res, getStatusData(), 'Orders module ready');
};

export { getStatus };

export default {
  getStatus,
};
