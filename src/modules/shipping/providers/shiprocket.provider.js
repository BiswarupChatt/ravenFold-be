import ApiError from '@/common/errors/api.error.js';
import { SHIPMENT_STATUS, SHIPPING_PROVIDER } from '@/common/constants/shipping.constant.js';
import shiprocketConfig from '@/config/shiprocket.config.js';
import {
  assertShippingProviderConfigured,
  buildProviderErrorMessage,
  getJson,
  postJson,
} from '@/modules/shipping/providers/provider.util.js';

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

const buildShiprocketUrl = (path) => `${shiprocketConfig.baseUrl.replace(/\/$/, '')}${path}`;

const buildPackage = (payload = {}) => ({
  breadth: Number(payload.breadth ?? 10),
  height: Number(payload.height ?? 5),
  length: Number(payload.length ?? 10),
  weight: Number(payload.weight ?? 0.5),
});

const getShiprocketResponseData = (response = {}) => (
  response.data ||
  response.response?.data ||
  response.response ||
  response
);

const hasMeaningfulValue = (value) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  return true;
};

const findNestedValueByKeys = (value, keys = [], visited = new Set()) => {
  if (!hasMeaningfulValue(value)) {
    return '';
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (visited.has(value)) {
    return '';
  }

  visited.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const nestedMatch = findNestedValueByKeys(item, keys, visited);

      if (hasMeaningfulValue(nestedMatch)) {
        return nestedMatch;
      }
    }

    return '';
  }

  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      continue;
    }

    const directMatch = findNestedValueByKeys(value[key], keys, visited);

    if (hasMeaningfulValue(directMatch)) {
      return directMatch;
    }
  }

  for (const nestedValue of Object.values(value)) {
    const nestedMatch = findNestedValueByKeys(nestedValue, keys, visited);

    if (hasMeaningfulValue(nestedMatch)) {
      return nestedMatch;
    }
  }

  return '';
};

const getShiprocketValue = (response = {}, keys = []) => {
  const dataMatch = findNestedValueByKeys(getShiprocketResponseData(response), keys);

  if (hasMeaningfulValue(dataMatch)) {
    return dataMatch.toString();
  }

  const responseMatch = findNestedValueByKeys(response, keys);

  if (hasMeaningfulValue(responseMatch)) {
    return responseMatch.toString();
  }

  return '';
};

const getProviderOrderId = (response = {}) => {
  const providerOrderId = getShiprocketValue(response, ['order_id', 'orderId']);

  if (providerOrderId) {
    return providerOrderId;
  }

  const data = getShiprocketResponseData(response);
  const fallbackOrderId = data?.id || response.id || '';

  return hasMeaningfulValue(fallbackOrderId) ? fallbackOrderId.toString() : '';
};

const getProviderShipmentId = (response = {}) => {
  return getShiprocketValue(response, ['shipment_id', 'shipmentId']);
};

const getAwbCode = (...responses) => {
  for (const response of responses) {
    const awbCode = getShiprocketValue(response, ['awb_code', 'awbCode']);

    if (awbCode) {
      return awbCode;
    }
  }

  return '';
};

const getCourierName = (...responses) => {
  for (const response of responses) {
    const courierName = getShiprocketValue(response, ['courier_name', 'courierName']);

    if (courierName) {
      return courierName;
    }
  }

  return '';
};

const getTrackingUrl = (...responses) => {
  for (const response of responses) {
    const trackingUrl = getShiprocketValue(response, ['tracking_url', 'trackingUrl']);

    if (trackingUrl) {
      return trackingUrl;
    }
  }

  return '';
};

const getShiprocketErrorMessage = (...responses) => {
  for (const response of responses) {
    const message = buildProviderErrorMessage(getShiprocketResponseData(response));

    if (message && message !== 'Shipping provider request failed') {
      return message;
    }

    const responseMessage = buildProviderErrorMessage(response);

    if (responseMessage && responseMessage !== 'Shipping provider request failed') {
      return responseMessage;
    }
  }

  return '';
};

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

const buildCourierOptionsQuery = ({ order, payload }) => {
  const address = order.shippingAddress || {};
  const packageDetails = buildPackage(payload);
  const pickupPincode = payload.pickupAddress?.pincode || payload.pickupPincode || '';
  const query = new URLSearchParams({
    breadth: String(packageDetails.breadth),
    cod: order.paymentMethod === 'cod' ? '1' : '0',
    declared_value: String(Number(order.totalPayable || order.subtotal || 0)),
    delivery_postcode: address.pincode || '',
    height: String(packageDetails.height),
    length: String(packageDetails.length),
    pickup_postcode: pickupPincode,
    weight: String(packageDetails.weight),
  });

  return query;
};

const formatCourierOption = (courier = {}) => {
  const courierCompanyId = courier.courier_company_id || courier.courierCompanyId || courier.id || courier.courier_id;
  const courierName = courier.courier_name || courier.courierName || courier.name || '';

  if (!courierCompanyId || !courierName) {
    return null;
  }

  return {
    blocked: Boolean(courier.blocked),
    charge: courier.rate ?? courier.freight_charge ?? courier.shipping_charge ?? null,
    courierCompanyId: courierCompanyId.toString(),
    courierName,
    estimatedDeliveryDays: courier.etd || courier.estimated_delivery_days || '',
    rating: courier.rating ?? null,
    rawProviderResponse: courier,
  };
};

const getCourierOptions = async ({ order, payload = {} }) => {
  const pickupPincode = payload.pickupAddress?.pincode || payload.pickupPincode || '';

  assertShippingProviderConfigured(pickupPincode, SHIPPING_PROVIDER.SHIPROCKET);

  const query = buildCourierOptionsQuery({ order, payload });
  const providerResponse = await getJson(
    buildShiprocketUrl(`/courier/serviceability/?${query.toString()}`),
    {
      headers: await getAuthHeaders(),
    },
  );
  const options = providerResponse.data?.available_courier_companies ||
    providerResponse.available_courier_companies ||
    providerResponse.courier_companies ||
    [];

  return {
    couriers: options.map(formatCourierOption).filter(Boolean),
    rawProviderResponse: providerResponse,
  };
};

const assignAwb = async ({ courierCompanyId, providerResponse = null, shipmentId }) => {
  if (!shipmentId) {
    throw new ApiError(
      502,
      getShiprocketErrorMessage(providerResponse) || 'Shiprocket did not return a shipment id for AWB assignment',
      {
      providerResponse,
      },
    );
  }

  const awbProviderResponse = await postJson(
    buildShiprocketUrl('/courier/assign/awb'),
    {
      courier_id: courierCompanyId,
      shipment_id: shipmentId,
    },
    {
      headers: await getAuthHeaders(),
    },
  );

  return awbProviderResponse;
};

const createShipment = async ({ items, order, payload = {}, user }) => {
  const createPayload = buildCreatePayload({ items, order, payload, user });
  const courierCompanyId = payload.courierCompanyId || payload.courier_id || payload.courierId || '';

  assertShippingProviderConfigured(createPayload.pickup_location, SHIPPING_PROVIDER.SHIPROCKET);

  if (!courierCompanyId) {
    throw new ApiError(400, 'Select a Shiprocket courier before creating AWB');
  }

  const providerResponse = await postJson(
    buildShiprocketUrl('/orders/create/adhoc'),
    createPayload,
    {
      headers: await getAuthHeaders(),
    },
  );
  const providerShipmentId = getProviderShipmentId(providerResponse);
  const awbResponse = await assignAwb({
    courierCompanyId,
    providerResponse,
    shipmentId: providerShipmentId,
  });
  const providerStatus = awbResponse.status ||
    awbResponse.shipment_status ||
    providerResponse.status ||
    providerResponse.shipment_status ||
    '';
  const awbCode = getAwbCode(awbResponse, providerResponse);

  if (!awbCode) {
    throw new ApiError(
      502,
      getShiprocketErrorMessage(awbResponse, providerResponse) || 'Shiprocket did not return an AWB for the selected courier',
      {
        awbResponse,
        providerResponse,
      },
    );
  }

  return {
    awbCode,
    courierCompanyId: courierCompanyId.toString(),
    courierName: getCourierName(awbResponse, providerResponse) || payload.courierName || '',
    invoiceUrl: getShiprocketResponseData(awbResponse).invoice_url || getShiprocketResponseData(providerResponse).invoice_url || '',
    labelUrl: getShiprocketResponseData(awbResponse).label_url || getShiprocketResponseData(providerResponse).label_url || '',
    providerOrderId: getProviderOrderId(providerResponse) || order.orderNumber,
    providerShipmentId,
    providerStatus: providerStatus || 'awb_assigned',
    rawProviderResponse: {
      assignAwb: awbResponse,
      createOrder: providerResponse,
    },
    status: normalizeProviderStatus(providerStatus || 'shipped'),
    trackingUrl: getTrackingUrl(awbResponse, providerResponse),
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

const testConnection = async () => {
  const token = await getAuthToken();

  return {
    authenticated: Boolean(token),
    pickupLocation: shiprocketConfig.pickupLocation || '',
  };
};

export default {
  cancelShipment,
  createShipment,
  getCourierOptions,
  name: SHIPPING_PROVIDER.SHIPROCKET,
  testConnection,
  trackShipment,
};
