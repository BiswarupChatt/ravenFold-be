import ApiError from '@/common/errors/api.error.js';
import { SHIPMENT_STATUS, SHIPPING_PROVIDER } from '@/common/constants/shipping.constant.js';
import shiprocketConfig from '@/config/shiprocket.config.js';
import { assertShippingProviderConfigured, getJson, postJson } from '@/modules/shipping/providers/provider.util.js';

let tokenCache = {
  expiresAt: 0,
  token: '',
};

const normalizeProviderStatus = (status = '') => {
  const normalized = String(status || '').toLowerCase();

  if (normalized.includes('delivered')) {
    return SHIPMENT_STATUS.DELIVERED;
  }

  if (normalized.includes('out for delivery')) {
    return SHIPMENT_STATUS.OUT_FOR_DELIVERY;
  }

  if (normalized.includes('pickup scheduled')) {
    return SHIPMENT_STATUS.PICKUP_SCHEDULED;
  }

  if (normalized.includes('picked') || normalized.includes('pickup')) {
    return SHIPMENT_STATUS.PICKED_UP;
  }

  if (normalized.includes('transit') || normalized.includes('shipped')) {
    return SHIPMENT_STATUS.IN_TRANSIT;
  }

  if (normalized.includes('cancel')) {
    return SHIPMENT_STATUS.CANCELLED;
  }

  if (normalized.includes('rto')) {
    return SHIPMENT_STATUS.RTO;
  }

  return SHIPMENT_STATUS.LABEL_CREATED;
};

const getAuthToken = async () => {
  assertShippingProviderConfigured(
    shiprocketConfig.baseUrl && shiprocketConfig.email && shiprocketConfig.password,
    SHIPPING_PROVIDER.SHIPROCKET,
  );

  if (tokenCache.token && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  const response = await postJson(`${shiprocketConfig.baseUrl.replace(/\/$/, '')}/auth/login`, {
    email: shiprocketConfig.email,
    password: shiprocketConfig.password,
  });

  if (!response?.token) {
    throw new ApiError(502, 'Shiprocket authentication did not return a token', response);
  }

  tokenCache = {
    expiresAt: Date.now() + 23 * 60 * 60 * 1000,
    token: response.token,
  };

  return tokenCache.token;
};

const getAuthHeaders = async () => ({
  Authorization: `Bearer ${await getAuthToken()}`,
});

const buildPackage = (payload = {}) => ({
  breadth: Number(payload.breadth ?? 10),
  height: Number(payload.height ?? 5),
  length: Number(payload.length ?? 10),
  weight: Number(payload.weight ?? 0.5),
});

const buildOrderItems = (items = []) => items.map((item) => ({
  discount: 0,
  name: item.productSnapshot?.name || item.productId?.toString() || 'Product',
  selling_price: Number(item.priceAtTime || 0),
  sku: item.productSnapshot?.variantSku || item.productSnapshot?.sku || item._id?.toString(),
  units: Number(item.quantity || 1),
}));

const buildCreatePayload = ({ items, order, payload, user }) => {
  const address = order.shippingAddress || {};
  const packageDetails = buildPackage(payload);

  return {
    billing_address: address.addressLine1,
    billing_address_2: address.addressLine2 || '',
    billing_alternate_phone: '',
    billing_city: address.city,
    billing_country: address.country || 'India',
    billing_customer_name: address.fullName,
    billing_email: user?.email || payload.email || '',
    billing_last_name: '',
    billing_phone: address.phone,
    billing_pincode: address.pincode,
    billing_state: address.state,
    breadth: packageDetails.breadth,
    channel_id: payload.channelId || '',
    height: packageDetails.height,
    length: packageDetails.length,
    order_date: new Date(order.placedAt || order.createdAt || Date.now()).toISOString().slice(0, 10),
    order_id: order.orderNumber,
    order_items: buildOrderItems(items),
    payment_method: order.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
    pickup_location: payload.pickupLocation || shiprocketConfig.pickupLocation,
    shipping_is_billing: true,
    sub_total: Number(order.subtotal || order.totalPayable || 0),
    total_discount: Number(order.bagDiscount || 0) + Number(order.couponDiscount || 0),
    weight: packageDetails.weight,
  };
};

const createShipment = async ({ items, order, payload = {}, user }) => {
  const createPayload = buildCreatePayload({ items, order, payload, user });

  assertShippingProviderConfigured(createPayload.pickup_location, SHIPPING_PROVIDER.SHIPROCKET);

  const providerResponse = await postJson(
    `${shiprocketConfig.baseUrl.replace(/\/$/, '')}/orders/create/adhoc`,
    createPayload,
    {
      headers: await getAuthHeaders(),
    },
  );
  const providerStatus = providerResponse.status || providerResponse.shipment_status || '';
  const awbCode = providerResponse.awb_code || providerResponse.awbCode || '';

  return {
    awbCode,
    courierName: providerResponse.courier_name || providerResponse.courierName || '',
    invoiceUrl: providerResponse.invoice_url || '',
    labelUrl: providerResponse.label_url || '',
    providerOrderId: providerResponse.order_id?.toString() || providerResponse.id?.toString() || order.orderNumber,
    providerShipmentId: providerResponse.shipment_id?.toString() || '',
    providerStatus: providerStatus || (awbCode ? 'shipment_created' : 'order_created'),
    rawProviderResponse: providerResponse,
    status: normalizeProviderStatus(providerStatus || (awbCode ? 'shipped' : 'label_created')),
    trackingUrl: providerResponse.tracking_url || '',
  };
};

const cancelShipment = async ({ shipment }) => {
  if (!shipment?.providerOrderId) {
    throw new ApiError(400, 'Shiprocket order id is required to cancel this shipment');
  }

  const providerResponse = await postJson(
    `${shiprocketConfig.baseUrl.replace(/\/$/, '')}/orders/cancel`,
    {
      ids: [shipment.providerOrderId],
    },
    {
      headers: await getAuthHeaders(),
    },
  );

  return {
    providerStatus: providerResponse.status || 'cancelled',
    rawProviderResponse: providerResponse,
    status: SHIPMENT_STATUS.CANCELLED,
  };
};

const trackShipment = async ({ shipment }) => {
  const trackingKey = shipment.awbCode || shipment.providerShipmentId;

  if (!trackingKey) {
    throw new ApiError(400, 'AWB or provider shipment id is required to track this shipment');
  }

  const providerResponse = await getJson(
    `${shiprocketConfig.baseUrl.replace(/\/$/, '')}/courier/track/awb/${encodeURIComponent(trackingKey)}`,
    {
      headers: await getAuthHeaders(),
    },
  );
  const providerStatus = providerResponse.tracking_data?.shipment_track?.[0]?.current_status ||
    providerResponse.current_status ||
    '';

  return {
    providerStatus,
    rawProviderResponse: providerResponse,
    status: normalizeProviderStatus(providerStatus),
  };
};

export default {
  cancelShipment,
  createShipment,
  name: SHIPPING_PROVIDER.SHIPROCKET,
  trackShipment,
};
