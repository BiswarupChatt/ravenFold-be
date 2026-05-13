import { sendSuccess } from '@/common/helpers/response.helper.js';

const getStatusData = () => {
  return {
    module: 'wishlist',
  };
};

const getStatus = async (req, res) => {
  return sendSuccess(res, getStatusData(), 'Wishlist module ready');
};

export { getStatus };

export default {
  getStatus,
};
