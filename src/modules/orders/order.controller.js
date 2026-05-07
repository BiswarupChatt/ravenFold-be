import orderService from '@/modules/orders/order.service.js';
import { sendSuccess } from '@/common/helpers/response.helper.js';

async function getStatus(req, res) {
  return sendSuccess(res, orderService.getStatus(), 'Orders module ready');
}

export { getStatus };

export default {
  getStatus,
};