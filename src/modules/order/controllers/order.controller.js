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

const listCustomerOrders = async (req, res) => {
  return sendSuccess(res, await orderService.listCustomerOrders(req.user, req.query), 'Orders fetched');
};

const getCustomerOrder = async (req, res) => {
  return sendSuccess(res, await orderService.getCustomerOrder(req.user, req.params.orderId), 'Order fetched');
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
  getCustomerOrder,
  getStatus,
  listCustomerOrders,
  listAdminOrders,
};

export default {
  createCheckoutOrder,
  getAdminOrder,
  getCustomerOrder,
  getStatus,
  listCustomerOrders,
  listAdminOrders,
};
