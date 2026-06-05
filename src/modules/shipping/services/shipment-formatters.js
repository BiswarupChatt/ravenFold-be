import { getDocumentId } from '@/common/utils/service.util.js';

const formatPackage = (packageDetails = {}) => ({
  breadth: packageDetails.breadth ?? null,
  height: packageDetails.height ?? null,
  length: packageDetails.length ?? null,
  weight: packageDetails.weight ?? null,
});

const formatPickupAddress = (address = {}) => ({
  addressLine1: address.addressLine1 || '',
  addressLine2: address.addressLine2 || '',
  city: address.city || '',
  country: address.country || '',
  name: address.name || '',
  phone: address.phone || '',
  pincode: address.pincode || '',
  state: address.state || '',
});

const formatShipment = (shipment = {}) => ({
  awbCode: shipment.awbCode || '',
  cancelledAt: shipment.cancelledAt,
  courierName: shipment.courierName || '',
  createdAt: shipment.createdAt,
  deliveredAt: shipment.deliveredAt,
  id: shipment.id || shipment._id?.toString(),
  invoiceUrl: shipment.invoiceUrl || '',
  labelUrl: shipment.labelUrl || '',
  lastSyncedAt: shipment.lastSyncedAt,
  notes: shipment.notes || '',
  orderId: getDocumentId(shipment.orderId),
  package: formatPackage(shipment.package),
  pickupAddress: formatPickupAddress(shipment.pickupAddress),
  pickupLocation: shipment.pickupLocation || '',
  pickupScheduledAt: shipment.pickupScheduledAt,
  provider: shipment.provider || '',
  providerOrderId: shipment.providerOrderId || '',
  providerShipmentId: shipment.providerShipmentId || '',
  providerStatus: shipment.providerStatus || '',
  shippedAt: shipment.shippedAt,
  status: shipment.status || '',
  trackingUrl: shipment.trackingUrl || '',
  updatedAt: shipment.updatedAt,
  userId: getDocumentId(shipment.userId),
});

const formatShipmentEvent = (event = {}) => ({
  createdAt: event.createdAt,
  eventAt: event.eventAt,
  id: event.id || event._id?.toString(),
  location: event.location || '',
  message: event.message || '',
  orderId: getDocumentId(event.orderId),
  provider: event.provider || '',
  providerEventId: event.providerEventId || '',
  providerStatus: event.providerStatus || '',
  shipmentId: getDocumentId(event.shipmentId),
  status: event.status || '',
  updatedAt: event.updatedAt,
});

export {
  formatShipment,
  formatShipmentEvent,
};

export default {
  formatShipment,
  formatShipmentEvent,
};
