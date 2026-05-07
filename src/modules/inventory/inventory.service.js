import { sendSuccess } from '@/common/helpers/response.helper.js';

const getStatusData = () => {
  return {
    module: 'inventory',
  };
};

const getStatus = async (req, res) => {
  return sendSuccess(res, getStatusData(), 'Inventory module ready');
};

export { getStatus };

export default {
  getStatus,
};
