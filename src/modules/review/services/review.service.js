import { sendSuccess } from '@/common/helpers/response.helper.js';

const getStatusData = () => {
  return {
    module: 'reviews',
  };
};

const getStatus = async (req, res) => {
  return sendSuccess(res, getStatusData(), 'Reviews module ready');
};

export { getStatus };

export default {
  getStatus,
};
