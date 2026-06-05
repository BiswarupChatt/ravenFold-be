const SHIPPING_PROVIDER = Object.freeze({
  DELHIVERY: 'delhivery',
  MANUAL: 'manual',
  SHIPROCKET: 'shiprocket',
});

const SHIPMENT_STATUS = Object.freeze({
  CANCELLED: 'cancelled',
  DELIVERED: 'delivered',
  IN_TRANSIT: 'in_transit',
  LABEL_CREATED: 'label_created',
  LOST: 'lost',
  NOT_CREATED: 'not_created',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  PICKED_UP: 'picked_up',
  PICKUP_SCHEDULED: 'pickup_scheduled',
  RTO: 'rto',
});

const SHIPMENT_TERMINAL_STATUSES = Object.freeze([
  SHIPMENT_STATUS.CANCELLED,
  SHIPMENT_STATUS.DELIVERED,
  SHIPMENT_STATUS.LOST,
  SHIPMENT_STATUS.RTO,
]);

export {
  SHIPMENT_STATUS,
  SHIPMENT_TERMINAL_STATUSES,
  SHIPPING_PROVIDER,
};

export default {
  SHIPMENT_STATUS,
  SHIPMENT_TERMINAL_STATUSES,
  SHIPPING_PROVIDER,
};
