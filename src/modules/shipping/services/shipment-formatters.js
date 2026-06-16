import { getDocumentId } from '@/common/utils/service.util.js';

const cleanProviderValue = (value = '') => {
  const normalizedValue = String(value || '').trim();

  return ['', '0', 'null', 'undefined', 'nan'].includes(normalizedValue.toLowerCase())
    ? ''
    : normalizedValue;
};

const formatPackage = (packageDetails = {}) => ({
  boxType: packageDetails.boxType || 'custom',
  boxTypeName: packageDetails.boxTypeName || '',
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
  awbCode: cleanProviderValue(shipment.awbCode),
  awbAssignedAt: shipment.awbAssignedAt,
  cancelledAt: shipment.cancelledAt,
  courierCharge: shipment.courierCharge ?? null,
  courierCompanyId: cleanProviderValue(shipment.courierCompanyId),
  courierName: cleanProviderValue(shipment.courierName),
  createdAt: shipment.createdAt,
  deliveredAt: shipment.deliveredAt,
  estimatedDeliveryDays: cleanProviderValue(shipment.estimatedDeliveryDays),
  id: shipment.id || shipment._id?.toString(),
  invoiceUrl: shipment.invoiceUrl || '',
  labelUrl: shipment.labelUrl || '',
  lastSyncedAt: shipment.lastSyncedAt,
  manifestUrl: shipment.manifestUrl || '',
  notes: shipment.notes || '',
  orderId: getDocumentId(shipment.orderId),
  package: formatPackage(shipment.package),
  pickupAddress: formatPickupAddress(shipment.pickupAddress),
  pickupLocationId: getDocumentId(shipment.pickupLocationId),
  pickupLocation: shipment.pickupLocation || '',
  pickupScheduledAt: shipment.pickupScheduledAt,
  pickupTokenNumber: cleanProviderValue(shipment.pickupTokenNumber),
  provider: shipment.provider || '',
  providerOrderId: cleanProviderValue(shipment.providerOrderId),
  providerOrderCreatedAt: shipment.providerOrderCreatedAt,
  providerShipmentId: cleanProviderValue(shipment.providerShipmentId),
  providerStatus: cleanProviderValue(shipment.providerStatus),
  shippedAt: shipment.shippedAt,
  status: shipment.status || '',
  trackingUrl: cleanProviderValue(shipment.trackingUrl),
  updatedAt: shipment.updatedAt,
  userId: getDocumentId(shipment.userId),
  events: Array.isArray(shipment.events) ? shipment.events.map(formatShipmentEvent) : [],
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
