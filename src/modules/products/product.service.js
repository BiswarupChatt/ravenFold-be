import { sendSuccess } from '@/common/helpers/response.helper.js';

const getStatusData = () => {
  return {
    module: 'products',
  };
};

const getStatus = async (req, res) => {
  return sendSuccess(res, getStatusData(), 'Products module ready');
};

export { getStatus };

export default {
  getStatus,
};
