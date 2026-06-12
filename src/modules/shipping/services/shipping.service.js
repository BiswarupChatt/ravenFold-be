import ApiError from '@/common/errors/api.error.js';
import { sendSuccess } from '@/common/helpers/response.helper.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '@/common/constants/order.constant.js';
import { SHIPMENT_STATUS, SHIPPING_PROVIDER } from '@/common/constants/shipping.constant.js';
import {
  normalizeShipmentPackageInput,
  resolveShipmentPackage,
  SHIPPING_CUSTOM_BOX_TYPE,
} from '@/common/utils/shipping-package.util.js';
import {
  assertDatabaseReady,
  getDocumentId,
  hasOwn,
  normalizeObjectId,
  normalizeOptionalObjectId,
  normalizeText,
} from '@/common/utils/service.util.js';
import OrderItem from '@/modules/order/models/order-item.model.js';
import OrderStatusHistory from '@/modules/order/models/order-status-history.model.js';
import Order from '@/modules/order/models/order.model.js';
import boxTypeService from '@/modules/box-type/services/box-type.service.js';
import ShipmentEvent from '@/modules/shipping/models/shipment-event.model.js';
import Shipment from '@/modules/shipping/models/shipment.model.js';
import pickupLocationService from '@/modules/shipping/services/pickup-location.service.js';
import { getShippingProvider, listShippingProviders } from '@/modules/shipping/providers/shipping-provider.registry.js';
import { formatShipment, formatShipmentEvent } from '@/modules/shipping/services/shipment-formatters.js';

const getStatusData = () => ({
  module: 'shipping',
  providers: listShippingProviders(),
  statuses: Object.values(SHIPMENT_STATUS),
});

const normalizeActorId = (actor = null) => {
  if (!actor?.id) {
    throw new ApiError(401, 'Authentication required');
  }

  return normalizeObjectId(actor.id, 'authenticated user');
};

const normalizeShipmentStatus = (value) => {
  const normalizedStatus = normalizeText(value).toLowerCase();
  const allowedStatuses = Object.values(SHIPMENT_STATUS);

  if (!allowedStatuses.includes(normalizedStatus)) {
    throw new ApiError(400, `status must be one of: ${allowedStatuses.join(', ')}`);
  }

  return normalizedStatus;
};

const normalizeShippingProvider = (value) => {
  const normalizedProvider = normalizeText(value || SHIPPING_PROVIDER.MANUAL).toLowerCase();
  const allowedProviders = Object.values(SHIPPING_PROVIDER);

  if (!allowedProviders.includes(normalizedProvider)) {
    throw new ApiError(400, `provider must be one of: ${allowedProviders.join(', ')}`);
  }

  return normalizedProvider;
};

const normalizeOptionalDate = (value, field) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${field} must be a valid date`);
  }

  return date;
};

const normalizePickupAddress = (payload = {}) => ({
  addressLine1: normalizeText(payload.addressLine1),
  addressLine2: normalizeText(payload.addressLine2),
  city: normalizeText(payload.city),
  country: normalizeText(payload.country) || 'India',
  name: normalizeText(payload.name),
  phone: normalizeText(payload.phone),
  pincode: normalizeText(payload.pincode),
  state: normalizeText(payload.state),
});

const getShipmentPickupLocation = async (payload = {}) => {
  const pickupLocationId = normalizeText(payload.pickupLocationId);

  if (!pickupLocationId) {
    return null;
  }

  return pickupLocationService.getActivePickupLocation(pickupLocationId);
};

const buildPickupAddressFromPickupLocation = (location = {}) => normalizePickupAddress({
  addressLine1: location.addressLine1,
  addressLine2: location.addressLine2,
  city: location.city,
  country: location.country,
  name: location.name,
  phone: location.phone,
  pincode: location.pincode,
  state: location.state,
});

const terminalOrderStatuses = new Set([
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.RETURNED,
]);

const shipmentStatusesForShippedOrder = new Set([
  SHIPMENT_STATUS.IN_TRANSIT,
  SHIPMENT_STATUS.OUT_FOR_DELIVERY,
  SHIPMENT_STATUS.PICKED_UP,
]);

const assertOrderCanBeFulfilled = (order) => {
  if (terminalOrderStatuses.has(order.status)) {
    throw new ApiError(400, `Order ${order.status} cannot be fulfilled`);
  }

  if (order.paymentStatus !== PAYMENT_STATUS.PAID) {
    throw new ApiError(400, 'Payment must be paid before fulfilment can continue');
  }
};

const getOrderForFulfillment = async (orderId) => {
  const normalizedOrderId = normalizeObjectId(orderId, 'order id');
  const order = await Order.findById(normalizedOrderId)
    .populate({ path: 'userId', select: 'name email phone avatar' })
    .exec();

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  return order;
};

const getOrderItems = async (orderId) => {
  return OrderItem.find({ orderId })
    .populate({ path: 'productId', select: 'shipping' })
    .sort({ createdAt: 1 })
    .lean()
    .exec();
};

const appendOrderStatusHistory = async ({ actorId, fromPaymentStatus, fromStatus, note, order }) => {
  await OrderStatusHistory.create({
    createdBy: actorId || getDocumentId(order.userId),
    fromPaymentStatus,
    fromStatus,
    note,
    orderId: order._id,
    toPaymentStatus: order.paymentStatus,
    toStatus: order.status,
  });
};

const updateOrderStatus = async ({ actorId, nextStatus, note, order }) => {
  if (!nextStatus || order.status === nextStatus) {
    return;
  }

  const fromStatus = order.status;
  const fromPaymentStatus = order.paymentStatus;

  order.status = nextStatus;

  if (nextStatus === ORDER_STATUS.CANCELLED && !order.cancelledAt) {
    order.cancelledAt = new Date();
  }

  await order.save();
  await appendOrderStatusHistory({
    actorId,
    fromPaymentStatus,
    fromStatus,
    note,
    order,
  });
};

const getOrderStatusFromShipmentStatus = (shipmentStatus, currentOrderStatus) => {
  if (shipmentStatus === SHIPMENT_STATUS.DELIVERED) {
    return ORDER_STATUS.DELIVERED;
  }

  if (shipmentStatusesForShippedOrder.has(shipmentStatus)) {
    return ORDER_STATUS.SHIPPED;
  }

  if ([SHIPMENT_STATUS.LABEL_CREATED, SHIPMENT_STATUS.PICKUP_SCHEDULED].includes(shipmentStatus)) {
    return ORDER_STATUS.PACKED;
  }

  if (shipmentStatus === SHIPMENT_STATUS.CANCELLED && currentOrderStatus === ORDER_STATUS.SHIPPED) {
    return ORDER_STATUS.PACKED;
  }

  return currentOrderStatus;
};

const createShipmentEvent = async ({
  eventAt = null,
  location = '',
  message = '',
  rawEvent = null,
  shipment,
  status,
}) => {
  const event = await ShipmentEvent.create({
    eventAt: eventAt || new Date(),
    location,
    message,
    orderId: shipment.orderId,
    provider: shipment.provider,
    providerStatus: shipment.providerStatus || '',
    rawEvent,
    shipmentId: shipment._id,
    status,
  });

  return event.toObject();
};

const getShipmentEventsByShipmentIds = async (shipmentIds = []) => {
  if (!shipmentIds.length) {
    return new Map();
  }

  const events = await ShipmentEvent.find({ shipmentId: { $in: shipmentIds } })
    .sort({ eventAt: -1, createdAt: -1 })
    .lean()
    .exec();
  const eventsByShipmentId = new Map();

  for (const event of events) {
    const shipmentId = getDocumentId(event.shipmentId);
    const shipmentEvents = eventsByShipmentId.get(shipmentId) || [];

    shipmentEvents.push(formatShipmentEvent(event));
    eventsByShipmentId.set(shipmentId, shipmentEvents);
  }

  return eventsByShipmentId;
};

const testShippingProviderConnection = async (providerName = SHIPPING_PROVIDER.SHIPROCKET) => {
  assertDatabaseReady();
  const normalizedProviderName = normalizeShippingProvider(providerName);
  const provider = getShippingProvider(normalizedProviderName);
  const activePickupLocationList = await pickupLocationService.listPickupLocations({}, { includeInactive: false });
  const connectionResult = provider.testConnection
    ? await provider.testConnection()
    : { authenticated: false };

  return {
    activePickupLocationCount: activePickupLocationList.pagination.total,
    activePickupLocations: activePickupLocationList.items.map((location) => ({
      code: location.code,
      id: location.id,
      name: location.name,
      pickupLocation: location.pickupLocation,
    })),
    authenticated: Boolean(connectionResult.authenticated),
    defaultPickupLocation: connectionResult.pickupLocation || '',
    provider: normalizedProviderName,
    readyForShipment: Boolean(
      connectionResult.authenticated &&
      (
        connectionResult.pickupLocation ||
        activePickupLocationList.items.length > 0
      ),
    ),
  };
};

const getProviderPickupLocations = async (actor, providerName = SHIPPING_PROVIDER.SHIPROCKET) => {
  assertDatabaseReady();
  normalizeActorId(actor);

  const normalizedProviderName = normalizeShippingProvider(providerName);
  const provider = getShippingProvider(normalizedProviderName);

  if (!provider.listPickupLocations) {
    return {
      items: [],
      provider: normalizedProviderName,
    };
  }

  const providerResult = await provider.listPickupLocations();

  return {
    items: Array.isArray(providerResult.items) ? providerResult.items : [],
    provider: normalizedProviderName,
  };
};

const getOrderShipments = async (orderId, { includeEvents = false } = {}) => {
  const shipments = await Shipment.find({ orderId })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  if (!includeEvents || shipments.length === 0) {
    return shipments.map(formatShipment);
  }

  const eventsByShipmentId = await getShipmentEventsByShipmentIds(shipments.map((shipment) => shipment._id));

  return shipments.map((shipment) => ({
    ...formatShipment(shipment),
    events: eventsByShipmentId.get(getDocumentId(shipment._id)) || [],
  }));
};

const markOrderPacked = async (actor, orderId, payload = {}) => {
  assertDatabaseReady();
  const actorId = normalizeActorId(actor);
  const order = await getOrderForFulfillment(orderId);

  assertOrderCanBeFulfilled(order);

  if (![ORDER_STATUS.CONFIRMED, ORDER_STATUS.PACKED].includes(order.status)) {
    throw new ApiError(400, `Order must be confirmed before packing. Current status: ${order.status}`);
  }

  await updateOrderStatus({
    actorId,
    nextStatus: ORDER_STATUS.PACKED,
    note: normalizeText(payload.note) || 'Order marked packed',
    order,
  });

  return {
    orderId: order._id.toString(),
    status: order.status,
  };
};

const buildShipmentPayload = ({ order, payload, providerResult }) => {
  const shipmentStatus = normalizeShipmentStatus(providerResult.status || SHIPMENT_STATUS.LABEL_CREATED);
  const now = new Date();

  return {
    awbCode: providerResult.awbCode || normalizeText(payload.awbCode),
    courierCompanyId: providerResult.courierCompanyId || normalizeText(payload.courierCompanyId),
    courierName: providerResult.courierName || normalizeText(payload.courierName),
    deliveredAt: shipmentStatus === SHIPMENT_STATUS.DELIVERED
      ? normalizeOptionalDate(payload.deliveredAt, 'deliveredAt') || now
      : null,
    invoiceUrl: providerResult.invoiceUrl || normalizeText(payload.invoiceUrl),
    labelUrl: providerResult.labelUrl || normalizeText(payload.labelUrl),
    notes: normalizeText(payload.notes),
    orderId: order._id,
    package: normalizeShipmentPackageInput(payload),
    pickupAddress: normalizePickupAddress(payload.pickupAddress || {}),
    pickupLocationId: normalizeOptionalObjectId(payload.pickupLocationId, 'pickup location id'),
    pickupLocation: normalizeText(payload.pickupLocation),
    pickupScheduledAt: normalizeOptionalDate(payload.pickupScheduledAt, 'pickupScheduledAt'),
    provider: providerResult.provider || normalizeShippingProvider(payload.provider),
    providerOrderId: providerResult.providerOrderId || '',
    providerShipmentId: providerResult.providerShipmentId || '',
    providerStatus: providerResult.providerStatus || '',
    rawProviderResponse: providerResult.rawProviderResponse || null,
    shippedAt: shipmentStatusesForShippedOrder.has(shipmentStatus)
      ? normalizeOptionalDate(payload.shippedAt, 'shippedAt') || now
      : null,
    status: shipmentStatus,
    trackingUrl: providerResult.trackingUrl || normalizeText(payload.trackingUrl),
    userId: getDocumentId(order.userId),
  };
};

const resolveShipmentContext = async ({ order, payload = {} }) => {
  const items = await getOrderItems(order._id);
  const packageInput = normalizeShipmentPackageInput(payload);
  const pickupLocation = await getShipmentPickupLocation(payload);
  const selectedBoxType = packageInput.boxType && packageInput.boxType !== SHIPPING_CUSTOM_BOX_TYPE
    ? await boxTypeService.getActiveBoxTypeByCode(packageInput.boxType)
    : null;
  const resolvedPackage = resolveShipmentPackage({
    boxType: selectedBoxType,
    items,
    payload,
  });
  const resolvedPayload = {
    ...payload,
    ...resolvedPackage,
    ...(pickupLocation
      ? {
          pickupLocationId: pickupLocation.id,
          pickupAddress: buildPickupAddressFromPickupLocation(pickupLocation),
          pickupLocation: pickupLocation.pickupLocation || pickupLocation.name,
        }
      : {}),
  };
  const user = order.userId && typeof order.userId === 'object' ? order.userId : null;

  return {
    items,
    resolvedPayload,
    user,
  };
};

const getCourierOptionsForOrder = async (actor, orderId, payload = {}) => {
  assertDatabaseReady();
  normalizeActorId(actor);

  const providerName = normalizeShippingProvider(payload.provider);
  const provider = getShippingProvider(providerName);
  const order = await getOrderForFulfillment(orderId);

  assertOrderCanBeFulfilled(order);

  if (![ORDER_STATUS.CONFIRMED, ORDER_STATUS.PACKED, ORDER_STATUS.SHIPPED].includes(order.status)) {
    throw new ApiError(400, `Courier options cannot be fetched from status: ${order.status}`);
  }

  if (!provider.getCourierOptions) {
    return {
      couriers: [],
      provider: providerName,
    };
  }

  const {
    items,
    resolvedPayload,
    user,
  } = await resolveShipmentContext({ order, payload });
  const providerResult = await provider.getCourierOptions({
    items,
    order,
    payload: resolvedPayload,
    user,
  });

  return {
    couriers: providerResult.couriers || [],
    provider: providerName,
  };
};

const createShipmentForOrder = async (actor, orderId, payload = {}) => {
  assertDatabaseReady();
  const actorId = normalizeActorId(actor);
  const providerName = normalizeShippingProvider(payload.provider);
  const provider = getShippingProvider(providerName);
  const order = await getOrderForFulfillment(orderId);

  assertOrderCanBeFulfilled(order);

  if (![ORDER_STATUS.CONFIRMED, ORDER_STATUS.PACKED, ORDER_STATUS.SHIPPED].includes(order.status)) {
    throw new ApiError(400, `Order cannot be shipped from status: ${order.status}`);
  }

  const {
    items,
    resolvedPayload,
    user,
  } = await resolveShipmentContext({ order, payload });
  const providerResult = await provider.createShipment({
    items,
    order,
    payload: resolvedPayload,
    user,
  });
  const shipment = await Shipment.create(buildShipmentPayload({
    order,
    payload: resolvedPayload,
    providerResult: {
      ...providerResult,
      provider: providerName,
    },
  }));
  const nextOrderStatus = getOrderStatusFromShipmentStatus(shipment.status, order.status);

  await createShipmentEvent({
    message: normalizeText(payload.note) || `Shipment created with ${providerName}`,
    rawEvent: providerResult.rawProviderResponse,
    shipment,
    status: shipment.status,
  });

  await updateOrderStatus({
    actorId,
    nextStatus: nextOrderStatus,
    note: `Shipment ${shipment.awbCode || shipment._id.toString()} created via ${providerName}`,
    order,
  });

  return formatShipment(shipment.toObject());
};

const getShipmentForAdmin = async (shipmentId) => {
  const normalizedShipmentId = normalizeObjectId(shipmentId, 'shipment id');
  const shipment = await Shipment.findById(normalizedShipmentId).exec();

  if (!shipment) {
    throw new ApiError(404, 'Shipment not found');
  }

  return shipment;
};

const updateShipmentStatus = async (actor, shipmentId, payload = {}) => {
  assertDatabaseReady();
  const actorId = normalizeActorId(actor);
  const status = normalizeShipmentStatus(payload.status);
  const shipment = await getShipmentForAdmin(shipmentId);
  const order = await getOrderForFulfillment(shipment.orderId);
  const now = new Date();

  if (hasOwn(payload, 'awbCode')) {
    shipment.awbCode = normalizeText(payload.awbCode);
  }

  if (hasOwn(payload, 'courierName')) {
    shipment.courierName = normalizeText(payload.courierName);
  }

  if (hasOwn(payload, 'trackingUrl')) {
    shipment.trackingUrl = normalizeText(payload.trackingUrl);
  }

  shipment.status = status;
  shipment.providerStatus = normalizeText(payload.providerStatus) || shipment.providerStatus;
  shipment.lastSyncedAt = now;

  if (status === SHIPMENT_STATUS.DELIVERED && !shipment.deliveredAt) {
    shipment.deliveredAt = normalizeOptionalDate(payload.deliveredAt, 'deliveredAt') || now;
  }

  if (shipmentStatusesForShippedOrder.has(status) && !shipment.shippedAt) {
    shipment.shippedAt = normalizeOptionalDate(payload.shippedAt, 'shippedAt') || now;
  }

  if (status === SHIPMENT_STATUS.CANCELLED && !shipment.cancelledAt) {
    shipment.cancelledAt = now;
  }

  await shipment.save();
  await createShipmentEvent({
    eventAt: normalizeOptionalDate(payload.eventAt, 'eventAt'),
    location: normalizeText(payload.location),
    message: normalizeText(payload.note) || `Shipment marked ${status}`,
    shipment,
    status,
  });

  await updateOrderStatus({
    actorId,
    nextStatus: getOrderStatusFromShipmentStatus(status, order.status),
    note: `Shipment ${shipment.awbCode || shipment._id.toString()} marked ${status}`,
    order,
  });

  return formatShipment(shipment.toObject());
};

const cancelShipment = async (actor, shipmentId, payload = {}) => {
  assertDatabaseReady();
  const actorId = normalizeActorId(actor);
  const shipment = await getShipmentForAdmin(shipmentId);
  const order = await getOrderForFulfillment(shipment.orderId);
  const provider = getShippingProvider(shipment.provider);
  const providerResult = await provider.cancelShipment({ payload, shipment });
  const now = new Date();

  shipment.cancelledAt = shipment.cancelledAt || now;
  shipment.lastSyncedAt = now;
  shipment.providerStatus = providerResult.providerStatus || shipment.providerStatus;
  shipment.rawProviderResponse = providerResult.rawProviderResponse || shipment.rawProviderResponse;
  shipment.status = SHIPMENT_STATUS.CANCELLED;

  await shipment.save();
  await createShipmentEvent({
    message: normalizeText(payload.note) || 'Shipment cancelled',
    rawEvent: providerResult.rawProviderResponse,
    shipment,
    status: SHIPMENT_STATUS.CANCELLED,
  });

  await updateOrderStatus({
    actorId,
    nextStatus: getOrderStatusFromShipmentStatus(SHIPMENT_STATUS.CANCELLED, order.status),
    note: `Shipment ${shipment.awbCode || shipment._id.toString()} cancelled`,
    order,
  });

  return formatShipment(shipment.toObject());
};

const getStatus = async (req, res) => {
  return sendSuccess(res, getStatusData(), 'Shipping module ready');
};

export {
  cancelShipment,
  createShipmentForOrder,
  getProviderPickupLocations,
  getCourierOptionsForOrder,
  getOrderShipments,
  getStatus,
  getStatusData,
  markOrderPacked,
  testShippingProviderConnection,
  updateShipmentStatus,
};

export default {
  cancelShipment,
  createShipmentForOrder,
  getProviderPickupLocations,
  getCourierOptionsForOrder,
  getOrderShipments,
  getStatus,
  getStatusData,
  markOrderPacked,
  testShippingProviderConnection,
  updateShipmentStatus,
};
