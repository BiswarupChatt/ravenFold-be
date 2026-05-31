import { sendSuccess } from '@/common/helpers/response.helper.js';
import orderService from '@/modules/order/services/order.service.js';

const getStatus = async (req, res) => {
  return sendSuccess(res, orderService.getStatusData(), 'Orders module ready');
};

const createCheckoutOrder = async (req, res) => {
  return sendSuccess(
    res,
    await orderService.createCheckoutOrder(req.user, req.body),
    'Checkout order created',
    201,
  );
};

const listAdminOrders = async (req, res) => {
  return sendSuccess(res, await orderService.listAdminOrders(req.query), 'Orders fetched');
};

const getAdminOrder = async (req, res) => {
  return sendSuccess(res, await orderService.getAdminOrder(req.params.orderId), 'Order fetched');
};

export {
  createCheckoutOrder,
  getAdminOrder,
  getStatus,
  listAdminOrders,
};

export default {
  createCheckoutOrder,
  getAdminOrder,
  getStatus,
  listAdminOrders,
};
