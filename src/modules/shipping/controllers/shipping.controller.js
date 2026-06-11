import { sendSuccess } from '@/common/helpers/response.helper.js';
import pickupLocationService from '@/modules/shipping/services/pickup-location.service.js';
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

const testShippingProviderConnection = async (req, res) => {
  return sendSuccess(
    res,
    await shippingService.testShippingProviderConnection(req.params.providerName),
    'Shipping provider connection tested',
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

const createPickupLocation = async (req, res) => {
  return sendSuccess(
    res,
    await pickupLocationService.createPickupLocation(req.body),
    'Pickup location created',
    201,
  );
};

const listAdminPickupLocations = async (req, res) => {
  return sendSuccess(
    res,
    await pickupLocationService.listPickupLocations(req.query, { includeInactive: true }),
    'Pickup locations fetched',
  );
};

const getAdminPickupLocation = async (req, res) => {
  return sendSuccess(
    res,
    await pickupLocationService.getPickupLocation(req.params.pickupLocationIdOrCode, { includeInactive: true }),
    'Pickup location fetched',
  );
};

const updatePickupLocation = async (req, res) => {
  return sendSuccess(
    res,
    await pickupLocationService.updatePickupLocation(req.params.pickupLocationId, req.body),
    'Pickup location updated',
  );
};

const deletePickupLocation = async (req, res) => {
  return sendSuccess(
    res,
    await pickupLocationService.deletePickupLocation(req.params.pickupLocationId),
    'Pickup location deleted',
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
  createPickupLocation,
  createShipmentForOrder,
  deletePickupLocation,
  getAdminPickupLocation,
  getStatus,
  listAdminPickupLocations,
  listOrderShipments,
  markOrderPacked,
  testShippingProviderConnection,
  updatePickupLocation,
  updateShipmentStatus,
};

export default {
  cancelShipment,
  createPickupLocation,
  createShipmentForOrder,
  deletePickupLocation,
  getAdminPickupLocation,
  getStatus,
  listAdminPickupLocations,
  listOrderShipments,
  markOrderPacked,
  testShippingProviderConnection,
  updatePickupLocation,
  updateShipmentStatus,
};
