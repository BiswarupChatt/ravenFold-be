import { sendSuccess } from '@/common/helpers/response.helper.js';

const getDashboardData = () => {
  return {
    orders: 0,
    revenue: 0,
    customers: 0,
  };
};

const getDashboard = async (req, res) => {
  return sendSuccess(res, getDashboardData(), 'Admin dashboard ready');
};

export { getDashboard };

export default {
  getDashboard,
};
