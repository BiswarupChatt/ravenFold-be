import { sendSuccess } from '@/common/helpers/response.helper.js';
import shippingService from '@/modules/shipping/services/shipping.service.js';

const getStatus = async (req, res) => {
  return sendSuccess(res, shippingService.getStatusData(), 'Shipping module ready');
};

const listOrderShipments = async (req, res) => {
  return sendSuccess(
    res,
    await shippingService.getOrderShipments(req.params.orderId, { includeEvents: true }),
    'Shipments fetched',
  );
};

const markOrderPacked = async (req, res) => {
  return sendSuccess(
    res,
    await shippingService.markOrderPacked(req.user, req.params.orderId, req.body),
    'Order marked packed',
  );
};

const createShipmentForOrder = async (req, res) => {
  return sendSuccess(
    res,
    await shippingService.createShipmentForOrder(req.user, req.params.orderId, req.body),
    'Shipment created',
    201,
  );
};

const updateShipmentStatus = async (req, res) => {
  return sendSuccess(
    res,
    await shippingService.updateShipmentStatus(req.user, req.params.shipmentId, req.body),
    'Shipment updated',
  );
};

const cancelShipment = async (req, res) => {
  return sendSuccess(
    res,
    await shippingService.cancelShipment(req.user, req.params.shipmentId, req.body),
    'Shipment cancelled',
  );
};

export {
  cancelShipment,
  createShipmentForOrder,
  getStatus,
  listOrderShipments,
  markOrderPacked,
  updateShipmentStatus,
};

export default {
  cancelShipment,
  createShipmentForOrder,
  getStatus,
  listOrderShipments,
  markOrderPacked,
  updateShipmentStatus,
};
