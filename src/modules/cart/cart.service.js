import { sendSuccess } from '@/common/helpers/response.helper.js';

const getStatusData = () => {
  return {
    module: 'cart',
  };
};

const getStatus = async (req, res) => {
  return sendSuccess(res, getStatusData(), 'Cart module ready');
};

export { getStatus };

export default {
  getStatus,
};
