import { timingSafeEqual as timingSafeEqualBuffers } from 'node:crypto';

import ApiError from '@/common/errors/api.error.js';
import { sendSuccess } from '@/common/helpers/response.helper.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '@/common/constants/order.constant.js';
import {
  SHIPMENT_STATUS,
  SHIPPING_PROVIDER,
} from '@/common/constants/shipping.constant.js';
import shiprocketConfig from '@/config/shiprocket.config.js';
import {
  normalizeShipmentPackageInput,
  resolveShipmentPackage,
  SHIPPING_CUSTOM_BOX_TYPE,
} from '@/common/utils/shipping-package.util.js';
import {
  assertDatabaseReady,
  getDocumentId,
  normalizeObjectId,
  normalizeOptionalNumber,
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
import { formatShipment } from '@/modules/shipping/services/shipment-formatters.js';

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

const normalizeOptionalCharge = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return normalizeOptionalNumber(value, 'courierCharge');
};

const secureTextEqual = (left = '', right = '') => {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqualBuffers(leftBuffer, rightBuffer);
};

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

const inactiveShipmentStatuses = [
  SHIPMENT_STATUS.CANCELLED,
  SHIPMENT_STATUS.LOST,
  SHIPMENT_STATUS.RTO,
];

const providerOrderCreationLocks = new Set();

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
  if (terminalOrderStatuses.has(currentOrderStatus)) {
    return currentOrderStatus;
  }

  if (shipmentStatus === SHIPMENT_STATUS.DELIVERED) {
    return ORDER_STATUS.DELIVERED;
  }

  if (shipmentStatusesForShippedOrder.has(shipmentStatus)) {
    return ORDER_STATUS.SHIPPED;
  }

  if (
    [
      SHIPMENT_STATUS.LABEL_CREATED,
      SHIPMENT_STATUS.PICKUP_SCHEDULED,
      SHIPMENT_STATUS.PROVIDER_ORDER_CREATED,
    ].includes(shipmentStatus)
  ) {
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
  providerEventId = '',
  providerStatus = '',
  rawEvent = null,
  shipment,
  status,
}) => {
  if (providerEventId) {
    const existingEvent = await ShipmentEvent.findOne({
      providerEventId,
      shipmentId: shipment._id,
    })
      .lean()
      .exec();

    if (existingEvent) {
      return existingEvent;
    }
  }

  const event = await ShipmentEvent.create({
    eventAt: eventAt || new Date(),
    location,
    message,
    orderId: shipment.orderId,
    provider: shipment.provider,
    providerEventId,
    providerStatus: normalizeText(providerStatus) || shipment.providerStatus || '',
    rawEvent,
    shipmentId: shipment._id,
    status,
  });

  return event.toObject();
};

const mergeShipmentRawProviderResponse = (shipment, key, value) => {
  const existingValue = shipment.rawProviderResponse && typeof shipment.rawProviderResponse === 'object'
    ? shipment.rawProviderResponse
    : shipment.rawProviderResponse
      ? { previous: shipment.rawProviderResponse }
      : {};

  shipment.rawProviderResponse = {
    ...existingValue,
    [key]: value,
  };
};

const applyTrackingSnapshotToShipment = ({ now = new Date(), providerResult, shipment }) => {
  const status = normalizeShipmentStatus(providerResult.status || shipment.status || SHIPMENT_STATUS.LABEL_CREATED);

  shipment.awbCode = providerResult.awbCode || shipment.awbCode;
  shipment.awbAssignedAt = shipment.awbAssignedAt || (providerResult.awbCode ? now : null);
  shipment.courierCompanyId = providerResult.courierCompanyId || shipment.courierCompanyId;
  shipment.courierCharge = providerResult.courierCharge ?? shipment.courierCharge;
  shipment.courierName = providerResult.courierName || shipment.courierName;
  shipment.estimatedDeliveryDays = providerResult.estimatedDeliveryDays || shipment.estimatedDeliveryDays;
  shipment.invoiceUrl = providerResult.invoiceUrl || shipment.invoiceUrl;
  shipment.labelUrl = providerResult.labelUrl || shipment.labelUrl;
  shipment.lastSyncedAt = now;
  shipment.manifestUrl = providerResult.manifestUrl || shipment.manifestUrl;
  shipment.pickupTokenNumber = providerResult.pickupTokenNumber || shipment.pickupTokenNumber;
  shipment.providerOrderId = providerResult.providerOrderId || shipment.providerOrderId;
  shipment.providerOrderCreatedAt = shipment.providerOrderId
    ? shipment.providerOrderCreatedAt || now
    : shipment.providerOrderCreatedAt;
  shipment.providerShipmentId = providerResult.providerShipmentId || shipment.providerShipmentId;
  shipment.providerStatus = normalizeText(providerResult.providerStatus) || shipment.providerStatus;
  shipment.status = status;
  shipment.trackingUrl = providerResult.trackingUrl || shipment.trackingUrl;

  if (providerResult.pickupScheduledAt) {
    shipment.pickupScheduledAt = normalizeOptionalDate(providerResult.pickupScheduledAt, 'pickupScheduledAt')
      || shipment.pickupScheduledAt;
  }

  if (status === SHIPMENT_STATUS.DELIVERED && !shipment.deliveredAt) {
    shipment.deliveredAt = now;
  }

  if (shipmentStatusesForShippedOrder.has(status) && !shipment.shippedAt) {
    shipment.shippedAt = now;
  }

  return status;
};

const persistTrackingEvents = async ({ events = [], shipment }) => {
  for (const event of events) {
    await createShipmentEvent({
      eventAt: event.eventAt,
      location: event.location,
      message: event.message,
      providerEventId: event.providerEventId,
      providerStatus: event.providerStatus,
      rawEvent: event.rawEvent,
      shipment,
      status: event.status,
    });
  }
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
    awbAssignedAt: providerResult.awbCode
      ? normalizeOptionalDate(payload.awbAssignedAt, 'awbAssignedAt') || now
      : null,
    courierCompanyId: providerResult.courierCompanyId || normalizeText(payload.courierCompanyId),
    courierCharge: providerResult.courierCharge ?? normalizeOptionalCharge(payload.courierCharge),
    courierName: providerResult.courierName || normalizeText(payload.courierName),
    deliveredAt: shipmentStatus === SHIPMENT_STATUS.DELIVERED
      ? normalizeOptionalDate(payload.deliveredAt, 'deliveredAt') || now
      : null,
    estimatedDeliveryDays: normalizeText(providerResult.estimatedDeliveryDays || payload.estimatedDeliveryDays),
    invoiceUrl: providerResult.invoiceUrl || normalizeText(payload.invoiceUrl),
    labelUrl: providerResult.labelUrl || normalizeText(payload.labelUrl),
    notes: normalizeText(payload.notes),
    orderId: order._id,
    package: normalizeShipmentPackageInput(payload),
    pickupAddress: normalizePickupAddress(payload.pickupAddress || {}),
    pickupLocationId: normalizeOptionalObjectId(payload.pickupLocationId, 'pickup location id'),
    pickupLocation: normalizeText(payload.pickupLocation),
    pickupScheduledAt: normalizeOptionalDate(
      providerResult.pickupScheduledAt || payload.pickupScheduledAt,
      'pickupScheduledAt',
    ),
    pickupTokenNumber: normalizeText(providerResult.pickupTokenNumber || payload.pickupTokenNumber),
    provider: providerResult.provider || normalizeShippingProvider(payload.provider),
    providerOrderId: providerResult.providerOrderId || '',
    providerOrderCreatedAt: providerResult.providerOrderId
      ? normalizeOptionalDate(payload.providerOrderCreatedAt, 'providerOrderCreatedAt') || now
      : null,
    providerShipmentId: providerResult.providerShipmentId || '',
    providerStatus: providerResult.providerStatus || '',
    rawProviderResponse: providerResult.rawProviderResponse || null,
    manifestUrl: providerResult.manifestUrl || normalizeText(payload.manifestUrl),
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

const createProviderOrderForOrder = async (actor, orderId, payload = {}) => {
  assertDatabaseReady();
  const actorId = normalizeActorId(actor);
  const providerName = normalizeShippingProvider(payload.provider);
  const provider = getShippingProvider(providerName);
  const order = await getOrderForFulfillment(orderId);
  const lockKey = `${providerName}:${order._id.toString()}`;

  assertOrderCanBeFulfilled(order);

  if (![ORDER_STATUS.CONFIRMED, ORDER_STATUS.PACKED].includes(order.status)) {
    throw new ApiError(400, `Provider order cannot be created from status: ${order.status}`);
  }

  if (!provider.createProviderOrder) {
    throw new ApiError(400, `${providerName} does not support creating a provider order separately`);
  }

  if (providerOrderCreationLocks.has(lockKey)) {
    throw new ApiError(409, 'Shipment creation is already in progress for this order');
  }

  providerOrderCreationLocks.add(lockKey);

  try {
    const existingShipment = await Shipment.findOne({
      orderId: order._id,
      status: { $nin: inactiveShipmentStatuses },
    })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (existingShipment) {
      throw new ApiError(
        409,
        'An active shipment already exists for this order',
        { shipment: formatShipment(existingShipment) },
      );
    }

    const {
      items,
      resolvedPayload,
      user,
    } = await resolveShipmentContext({ order, payload });
    const providerResult = await provider.createProviderOrder({
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
        rawProviderResponse: {
          createProviderOrder: providerResult.rawProviderResponse,
        },
      },
    }));

    await createShipmentEvent({
      message: normalizeText(payload.note) || `${providerName} order created`,
      rawEvent: providerResult.rawProviderResponse,
      shipment,
      status: shipment.status,
    });

    await updateOrderStatus({
      actorId,
      nextStatus: getOrderStatusFromShipmentStatus(shipment.status, order.status),
      note: `Provider order ${shipment.providerOrderId || shipment._id.toString()} created via ${providerName}`,
      order,
    });

    return formatShipment(shipment.toObject());
  } finally {
    providerOrderCreationLocks.delete(lockKey);
  }
};

const getShipmentForAdmin = async (shipmentId) => {
  const normalizedShipmentId = normalizeObjectId(shipmentId, 'shipment id');
  const shipment = await Shipment.findById(normalizedShipmentId).exec();

  if (!shipment) {
    throw new ApiError(404, 'Shipment not found');
  }

  return shipment;
};

const syncShipmentTracking = async (actor, shipmentId, payload = {}) => {
  assertDatabaseReady();
  const actorId = normalizeActorId(actor);
  const shipment = await getShipmentForAdmin(shipmentId);
  const order = await getOrderForFulfillment(shipment.orderId);
  const provider = getShippingProvider(shipment.provider);
  const now = new Date();
  const previousStatus = shipment.status;
  const previousProviderStatus = shipment.providerStatus;

  if (!provider.trackShipment) {
    throw new ApiError(400, `${shipment.provider} does not support tracking sync`);
  }

  const providerResult = await provider.trackShipment({ payload, shipment });
  const status = applyTrackingSnapshotToShipment({ now, providerResult, shipment });

  mergeShipmentRawProviderResponse(shipment, 'syncTracking', providerResult.rawProviderResponse || null);
  await shipment.save();
  await persistTrackingEvents({ events: providerResult.events || [], shipment });

  if (
    (!providerResult.events || providerResult.events.length === 0) &&
    (previousStatus !== status || previousProviderStatus !== shipment.providerStatus)
  ) {
    await createShipmentEvent({
      message: normalizeText(payload.note) || shipment.providerStatus || `Tracking synced for ${shipment.provider}`,
      rawEvent: providerResult.rawProviderResponse,
      shipment,
      status,
    });
  }

  await updateOrderStatus({
    actorId,
    nextStatus: getOrderStatusFromShipmentStatus(status, order.status),
    note: `Tracking synced for shipment ${shipment.awbCode || shipment._id.toString()}`,
    order,
  });

  return formatShipment(shipment.toObject());
};

const findShiprocketShipmentByWebhookIdentifiers = async ({
  awbCode = '',
  providerOrderId = '',
  providerShipmentId = '',
  sourceOrderReference = '',
}) => {
  const matchConditions = [];

  if (awbCode) {
    matchConditions.push({ awbCode });
  }

  if (providerOrderId) {
    matchConditions.push({ providerOrderId });
  }

  if (providerShipmentId) {
    matchConditions.push({ providerShipmentId });
  }

  if (matchConditions.length > 0) {
    const directShipment = await Shipment.findOne({
      provider: SHIPPING_PROVIDER.SHIPROCKET,
      $or: matchConditions,
    })
      .sort({ createdAt: -1 })
      .exec();

    if (directShipment) {
      return directShipment;
    }
  }

  if (!sourceOrderReference) {
    return null;
  }

  const linkedOrder = await Order.findOne({ orderNumber: sourceOrderReference })
    .select('_id')
    .lean()
    .exec();

  if (!linkedOrder?._id) {
    return null;
  }

  const draftShipment = await Shipment.findOne({
    provider: SHIPPING_PROVIDER.SHIPROCKET,
    orderId: linkedOrder._id,
    awbCode: '',
    providerShipmentId: '',
  })
    .sort({ createdAt: -1 })
    .exec();

  if (draftShipment) {
    return draftShipment;
  }

  return Shipment.findOne({
    provider: SHIPPING_PROVIDER.SHIPROCKET,
    orderId: linkedOrder._id,
  })
    .sort({ createdAt: -1 })
    .exec();
};

const handleShiprocketWebhook = async (req) => {
  assertDatabaseReady();

  const webhookSecret = shiprocketConfig.webhookSecret || '';

  if (!webhookSecret) {
    throw new ApiError(503, 'Shiprocket webhook secret is not configured');
  }

  const signature = req.get('x-api-key') || '';

  if (!signature || !secureTextEqual(signature, webhookSecret)) {
    throw new ApiError(400, 'Invalid Shiprocket webhook signature');
  }

  const payload = req.body || {};
  const provider = getShippingProvider(SHIPPING_PROVIDER.SHIPROCKET);
  const providerResult = provider.extractTrackingSnapshot
    ? provider.extractTrackingSnapshot(payload)
    : null;

  if (!providerResult) {
    throw new ApiError(400, 'Unsupported Shiprocket webhook payload');
  }

  const awbCode = normalizeText(providerResult.awbCode || payload.awb);
  const providerOrderId = normalizeText(payload.sr_order_id);
  const providerShipmentId = normalizeText(payload.shipment_id);
  const sourceOrderReference = normalizeText(
    payload.order_id ||
    payload.channel_order_id ||
    payload.channelOrderId,
  );

  if (!awbCode && !providerOrderId && !providerShipmentId && !sourceOrderReference) {
    return {
      matched: false,
      provider: SHIPPING_PROVIDER.SHIPROCKET,
      reason: 'No shipment identifiers or source order reference found in webhook payload',
    };
  }

  const shipment = await findShiprocketShipmentByWebhookIdentifiers({
    awbCode,
    providerOrderId,
    providerShipmentId,
    sourceOrderReference,
  });

  if (!shipment) {
    return {
      matched: false,
      provider: SHIPPING_PROVIDER.SHIPROCKET,
      reason: 'Shipment not found',
    };
  }

  const order = await getOrderForFulfillment(shipment.orderId);
  const now = new Date();
  const previousStatus = shipment.status;
  const previousProviderStatus = shipment.providerStatus;

  shipment.awbCode = shipment.awbCode || awbCode;
  shipment.awbAssignedAt = shipment.awbCode ? shipment.awbAssignedAt || now : shipment.awbAssignedAt;
  shipment.providerOrderId = shipment.providerOrderId || providerOrderId;
  shipment.providerOrderCreatedAt = shipment.providerOrderId
    ? shipment.providerOrderCreatedAt || now
    : shipment.providerOrderCreatedAt;
  shipment.providerShipmentId = shipment.providerShipmentId || providerShipmentId;

  const status = applyTrackingSnapshotToShipment({ now, providerResult, shipment });

  mergeShipmentRawProviderResponse(shipment, 'webhook', payload);
  await shipment.save();
  await persistTrackingEvents({ events: providerResult.events || [], shipment });

  if (
    (!providerResult.events || providerResult.events.length === 0) &&
    (previousStatus !== status || previousProviderStatus !== shipment.providerStatus)
  ) {
    await createShipmentEvent({
      message: shipment.providerStatus || 'Shiprocket webhook received',
      rawEvent: payload,
      shipment,
      status,
    });
  }

  await updateOrderStatus({
    actorId: null,
    nextStatus: getOrderStatusFromShipmentStatus(status, order.status),
    note: `Shiprocket webhook updated shipment ${shipment.awbCode || shipment._id.toString()}`,
    order,
  });

  return {
    matched: true,
    provider: SHIPPING_PROVIDER.SHIPROCKET,
    shipmentId: shipment._id.toString(),
    status: shipment.status,
  };
};

const getStatus = async (req, res) => {
  return sendSuccess(res, getStatusData(), 'Shipping module ready');
};

export {
  createProviderOrderForOrder,
  handleShiprocketWebhook,
  getStatus,
  getStatusData,
  markOrderPacked,
  syncShipmentTracking,
  testShippingProviderConnection,
};

export default {
  createProviderOrderForOrder,
  handleShiprocketWebhook,
  getStatus,
  getStatusData,
  markOrderPacked,
  syncShipmentTracking,
  testShippingProviderConnection,
};
