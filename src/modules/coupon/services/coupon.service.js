import { sendSuccess } from '@/common/helpers/response.helper.js';

const getStatusData = () => {
  return {
    module: 'coupons',
  };
};

const getStatus = async (req, res) => {
  return sendSuccess(res, getStatusData(), 'Coupons module ready');
};

export { getStatus };

export default {
  getStatus,
};
