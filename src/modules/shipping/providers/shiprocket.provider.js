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

const normalizeText = (value = '') => String(value || '').trim();

const normalizeProviderValue = (value = '') => {
  const normalizedValue = normalizeText(value);

  return ['', '0', 'null', 'undefined', 'nan'].includes(normalizedValue.toLowerCase())
    ? ''
    : normalizedValue;
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

const looksLikePickupLocation = (value = {}) => (
  value &&
  typeof value === 'object' &&
  (
    hasMeaningfulValue(value.pickup_location) ||
    hasMeaningfulValue(value.pickupLocation) ||
    hasMeaningfulValue(value.seller_name) ||
    hasMeaningfulValue(value.name)
  )
);

const collectPickupLocations = (value, visited = new Set()) => {
  if (!value || typeof value !== 'object') {
    return [];
  }

  if (visited.has(value)) {
    return [];
  }

  visited.add(value);

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectPickupLocations(item, visited));
  }

  const nestedLocations = Object.values(value).flatMap((nestedValue) => (
    collectPickupLocations(nestedValue, visited)
  ));

  return looksLikePickupLocation(value)
    ? [value, ...nestedLocations]
    : nestedLocations;
};

const getPickupLocationName = (location = {}) => normalizeText(
  location.pickup_location ||
  location.pickupLocation ||
  location.name ||
  location.seller_name ||
  '',
);

const isActivePickupLocation = (location = {}) => {
  const status = normalizeText(location.status || location.is_active || location.isActive).toLowerCase();

  return !['0', 'false', 'inactive', 'disabled'].includes(status);
};

const fetchDefaultPickupLocation = async () => {
  const providerResponse = await getJson(
    buildShiprocketUrl('/settings/company/pickup'),
    {
      headers: await getAuthHeaders(),
    },
  );
  const pickupLocations = collectPickupLocations(providerResponse)
    .filter((location) => getPickupLocationName(location));
  const selectedLocation = pickupLocations.find(isActivePickupLocation) || pickupLocations[0];
  const pickupLocation = getPickupLocationName(selectedLocation);

  if (!pickupLocation) {
    throw new ApiError(
      503,
      'Shiprocket pickup location is required. Configure a pickup location in Shiprocket or set SHIPROCKET_PICKUP_LOCATION in ravenFold-be/.env.',
      { providerResponse },
    );
  }

  return pickupLocation;
};

const resolvePickupLocation = async (payload = {}) => {
  const configuredPickupLocation = normalizeText(payload.pickupLocation || shiprocketConfig.pickupLocation);

  return configuredPickupLocation || fetchDefaultPickupLocation();
};

const getShiprocketRawValue = (response = {}, keys = []) => {
  const dataMatch = findNestedValueByKeys(getShiprocketResponseData(response), keys);

  if (hasMeaningfulValue(dataMatch)) {
    return dataMatch;
  }

  const responseMatch = findNestedValueByKeys(response, keys);

  if (hasMeaningfulValue(responseMatch)) {
    return responseMatch;
  }

  return null;
};

const getShiprocketValue = (response = {}, keys = []) => {
  const rawValue = getShiprocketRawValue(response, keys);

  return hasMeaningfulValue(rawValue) ? normalizeProviderValue(rawValue) : '';
};

const normalizeShiprocketRequestId = (value) => {
  if (!hasMeaningfulValue(value)) {
    return '';
  }

  if (typeof value === 'number') {
    return value > 0 ? value : '';
  }

  const normalizedValue = String(value).trim();

  if (/^\d+$/.test(normalizedValue)) {
    const numericValue = Number(normalizedValue);

    return numericValue > 0 ? numericValue : '';
  }

  return normalizedValue;
};

const getProviderOrderId = (response = {}) => {
  const providerOrderId = getShiprocketValue(response, ['order_id', 'orderId']);

  if (providerOrderId) {
    return providerOrderId;
  }

  const data = getShiprocketResponseData(response);
  const fallbackOrderId = normalizeProviderValue(data?.id || response.id || '');

  return hasMeaningfulValue(fallbackOrderId) ? fallbackOrderId.toString() : '';
};

const getProviderShipmentId = (response = {}) => {
  return getShiprocketValue(response, ['shipment_id', 'shipmentId']);
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

const buildShiprocketAwbTrackingUrl = (awbCode = '') => {
  if (!awbCode) {
    return '';
  }

  return `${shiprocketConfig.baseUrl.replace(/\/$/, '')}/courier/track/awb/${encodeURIComponent(awbCode)}`;
};

const buildShiprocketShipmentTrackingUrl = (shipmentId = '') => {
  if (!shipmentId) {
    return '';
  }

  return `${shiprocketConfig.baseUrl.replace(/\/$/, '')}/courier/track/shipment/${encodeURIComponent(shipmentId)}`;
};

const parseShiprocketDateValue = (value) => {
  if (!hasMeaningfulValue(value)) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const normalizedValue = String(value).trim();
  const directDate = new Date(normalizedValue);

  if (!Number.isNaN(directDate.getTime())) {
    return directDate;
  }

  let match = normalizedValue.match(/^(\d{2}) (\d{2}) (\d{4}) (\d{2}):(\d{2}):(\d{2})$/);

  if (match) {
    const [, day, month, year, hour, minute, second] = match;

    return new Date(Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ));
  }

  match = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}):(\d{2}))?$/);

  if (match) {
    const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;

    return new Date(Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ));
  }

  match = normalizedValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (match) {
    const [, day, month, year] = match;

    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  return null;
};

const getShiprocketTrackingScans = (response = {}) => {
  const data = getShiprocketResponseData(response);
  const scans = data?.tracking_data?.shipment_track_activities ||
    data?.tracking_data?.shipment_track?.[0]?.scans ||
    data?.tracking_data?.scans ||
    data?.scans ||
    response.tracking_data?.shipment_track_activities ||
    response.tracking_data?.shipment_track?.[0]?.scans ||
    response.scans;

  return Array.isArray(scans) ? scans : [];
};

const buildShiprocketEventId = (scan = {}, fallbackStatus = '') => (
  [
    scan['sr-status-label'] || scan.current_status || fallbackStatus || '',
    scan.status || '',
    scan.activity || '',
    scan.location || '',
    scan.date || scan.current_timestamp || '',
  ].join('|')
);

const formatShiprocketTrackingEvent = (scan = {}, fallbackStatus = '') => {
  const providerStatus = scan['sr-status-label'] ||
    scan.current_status ||
    fallbackStatus ||
    '';
  const status = normalizeProviderStatus(`${providerStatus} ${scan.activity || ''}`);

  return {
    eventAt: parseShiprocketDateValue(scan.date || scan.current_timestamp || scan.timestamp),
    location: scan.location || '',
    message: scan.activity || providerStatus || '',
    providerEventId: buildShiprocketEventId(scan, fallbackStatus),
    providerStatus,
    rawEvent: scan,
    status,
  };
};

const extractShiprocketTrackingSnapshot = (response = {}) => {
  const data = getShiprocketResponseData(response);
  const providerStatus = data?.tracking_data?.shipment_track?.[0]?.current_status ||
    data?.current_status ||
    data?.shipment_status ||
    response.tracking_data?.shipment_track?.[0]?.current_status ||
    response.current_status ||
    response.shipment_status ||
    '';
  const scans = getShiprocketTrackingScans(response);
  const events = scans
    .map((scan) => formatShiprocketTrackingEvent(scan, providerStatus))
    .filter((event) => event.status && event.message);
  const awbCode = getShiprocketValue(response, ['awb', 'awb_code', 'awbCode']);
  const resolvedProviderStatus = providerStatus || events[0]?.providerStatus || '';

  return {
    awbCode,
    courierCompanyId: getShiprocketValue(response, ['courier_company_id', 'courierCompanyId', 'courier_id', 'courierId']),
    courierName: getCourierName(response),
    estimatedDeliveryDays: getShiprocketValue(response, ['etd', 'estimated_delivery_days', 'estimatedDeliveryDays']),
    events,
    invoiceUrl: getShiprocketResponseData(response).invoice_url || '',
    labelUrl: getShiprocketResponseData(response).label_url || '',
    manifestUrl: getShiprocketResponseData(response).manifest_url || '',
    pickupScheduledAt: getShiprocketValue(response, ['pickup_scheduled_date']) || '',
    pickupTokenNumber: getShiprocketValue(response, ['pickup_token_number']) || '',
    providerOrderId: getProviderOrderId(response),
    providerShipmentId: getProviderShipmentId(response),
    providerStatus: resolvedProviderStatus,
    rawProviderResponse: response,
    status: resolvedProviderStatus ? normalizeProviderStatus(resolvedProviderStatus) : '',
    trackingUrl: getTrackingUrl(response) || buildShiprocketAwbTrackingUrl(awbCode),
  };
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

const buildCreatePayload = ({ items, order, payload, pickupLocation, user }) => {
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
    pickup_location: pickupLocation,
    shipping_is_billing: true,
    sub_total: Number(order.subtotal || order.totalPayable || 0),
    total_discount: Number(order.bagDiscount || 0) + Number(order.couponDiscount || 0),
    weight: packageDetails.weight,
  };
};

const createProviderOrder = async ({ items, order, payload = {}, user }) => {
  const pickupLocation = await resolvePickupLocation(payload);
  const createPayload = buildCreatePayload({ items, order, payload, pickupLocation, user });

  assertShippingProviderConfigured(createPayload.pickup_location, SHIPPING_PROVIDER.SHIPROCKET);

  const providerResponse = await postJson(
    buildShiprocketUrl('/orders/create/adhoc'),
    createPayload,
    {
      headers: await getAuthHeaders(),
    },
  );
  const providerOrderId = getProviderOrderId(providerResponse);
  const providerShipmentId = getProviderShipmentId(providerResponse);
  const providerStatus = providerResponse.status ||
    providerResponse.shipment_status ||
    'order_created';

  if (!providerOrderId || !providerShipmentId) {
    throw new ApiError(
      502,
      getShiprocketErrorMessage(providerResponse) || 'Shiprocket did not return a valid order or shipment id',
      {
        providerOrderId,
        providerResponse,
        providerShipmentId,
      },
    );
  }

  return {
    awbCode: '',
    courierCompanyId: '',
    courierName: '',
    invoiceUrl: getShiprocketResponseData(providerResponse).invoice_url || '',
    labelUrl: getShiprocketResponseData(providerResponse).label_url || '',
    providerOrderId,
    providerShipmentId,
    providerStatus: providerStatus || 'order_created',
    rawProviderResponse: providerResponse,
    status: SHIPMENT_STATUS.PROVIDER_ORDER_CREATED,
    trackingUrl: getTrackingUrl(providerResponse),
  };
};

const trackShipment = async ({ payload = {}, shipment }) => {
  const awbCode = normalizeShiprocketRequestId(payload.awbCode || shipment.awbCode);
  const shipmentId = normalizeShiprocketRequestId(payload.providerShipmentId || shipment.providerShipmentId);
  const trackingUrls = [
    awbCode ? buildShiprocketAwbTrackingUrl(awbCode) : '',
    shipmentId ? buildShiprocketShipmentTrackingUrl(shipmentId) : '',
  ].filter(Boolean);

  if (!trackingUrls.length) {
    throw new ApiError(400, 'AWB or provider shipment id is required to track this shipment');
  }

  let lastError = null;

  for (const trackingUrl of trackingUrls) {
    try {
      const providerResponse = await getJson(
        trackingUrl,
        {
          headers: await getAuthHeaders(),
        },
      );

      return extractShiprocketTrackingSnapshot(providerResponse);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

const testConnection = async () => {
  const token = await getAuthToken();
  const pickupLocation = await resolvePickupLocation();

  return {
    authenticated: Boolean(token),
    pickupLocation,
  };
};

export default {
  createProviderOrder,
  extractTrackingSnapshot: extractShiprocketTrackingSnapshot,
  name: SHIPPING_PROVIDER.SHIPROCKET,
  testConnection,
  trackShipment,
};
