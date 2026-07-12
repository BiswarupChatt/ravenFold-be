import { sendSuccess } from '@/common/helpers/response.helper.js';
import shippingService from '@/modules/shipping/services/shipping.service.js';

const getStatus = async (req, res) => {
  return sendSuccess(res, shippingService.getStatusData(), 'Shipping module ready');
};

const markOrderPacked = async (req, res) => {
  return sendSuccess(
    res,
    await shippingService.markOrderPacked(req.user, req.params.orderId, req.body),
    'Order marked packed',
  );
};

const createProviderOrderForOrder = async (req, res) => {
  return sendSuccess(
    res,
    await shippingService.createProviderOrderForOrder(req.user, req.params.orderId, req.body),
    'Provider order created',
    201,
  );
};

const syncShipmentTracking = async (req, res) => {
  return sendSuccess(
    res,
    await shippingService.syncShipmentTracking(req.user, req.params.shipmentId, req.body),
    'Shipment tracking synced',
  );
};

const handleShiprocketWebhook = async (req, res) => {
  return sendSuccess(
    res,
    await shippingService.handleShiprocketWebhook(req),
    'Shiprocket webhook received',
  );
};

export {
  createProviderOrderForOrder,
  getStatus,
  handleShiprocketWebhook,
  markOrderPacked,
  syncShipmentTracking,
};

export default {
  createProviderOrderForOrder,
  getStatus,
  handleShiprocketWebhook,
  markOrderPacked,
  syncShipmentTracking,
};
