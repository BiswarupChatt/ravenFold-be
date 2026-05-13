import { sendSuccess } from '@/common/helpers/response.helper.js';

const getStatusData = () => {
  return {
    module: 'shipping',
  };
};

const getStatus = async (req, res) => {
  return sendSuccess(res, getStatusData(), 'Shipping module ready');
};

export { getStatus };

export default {
  getStatus,
};
