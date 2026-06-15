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

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

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

  return hasMeaningfulValue(rawValue) ? rawValue.toString() : '';
};

const normalizeShiprocketRequestId = (value) => {
  if (!hasMeaningfulValue(value)) {
    return '';
  }

  if (typeof value === 'number') {
    return value;
  }

  const normalizedValue = String(value).trim();

  if (/^\d+$/.test(normalizedValue)) {
    return Number(normalizedValue);
  }

  return normalizedValue;
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

const buildShipmentIdArray = (shipmentId, response = null) => {
  const normalizedShipmentId = normalizeShiprocketRequestId(shipmentId);

  if (!normalizedShipmentId) {
    throw new ApiError(
      502,
      getShiprocketErrorMessage(response) || 'Shiprocket did not return a shipment id',
      {
        providerResponse: response,
        shipmentId,
      },
    );
  }

  return [normalizedShipmentId];
};

const buildShiprocketTrackingUrl = (trackingKey = '') => {
  if (!trackingKey) {
    return '';
  }

  return `${shiprocketConfig.baseUrl.replace(/\/$/, '')}/courier/track/awb/${encodeURIComponent(trackingKey)}`;
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
  const trackingKey = awbCode || getProviderShipmentId(response);

  return {
    awbCode,
    courierName: getCourierName(response),
    events,
    pickupScheduledAt: getShiprocketValue(response, ['pickup_scheduled_date']) || '',
    providerStatus: providerStatus || (events[0]?.providerStatus || ''),
    rawProviderResponse: response,
    status: normalizeProviderStatus(providerStatus || events[0]?.providerStatus || ''),
    trackingUrl: getTrackingUrl(response) || buildShiprocketTrackingUrl(trackingKey),
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

const formatShiprocketPickupLocation = (location = {}) => ({
  addressLine1: location.address || location.address_2 || '',
  addressLine2: location.address_2 || '',
  city: location.city || '',
  country: location.country || 'India',
  email: location.email || '',
  id: hasMeaningfulValue(location.id) ? location.id.toString() : '',
  isActive: String(location.status || '') !== '0',
  name: location.seller_name || location.pickup_location || '',
  phone: location.phone || '',
  pickupLocation: location.pickup_location || location.seller_name || '',
  pincode: location.pin_code || location.pincode || '',
  state: location.state || '',
  warehouseCode: location.warehouse_code || '',
});

const looksLikeShiprocketPickupLocation = (value = {}) => (
  value &&
  typeof value === 'object' &&
  (
    hasMeaningfulValue(value.pickup_location) ||
    hasMeaningfulValue(value.seller_name)
  ) &&
  (
    hasMeaningfulValue(value.pin_code) ||
    hasMeaningfulValue(value.pincode) ||
    hasMeaningfulValue(value.city)
  )
);

const findShiprocketPickupLocationCollection = (value, visited = new Set()) => {
  if (!value || typeof value !== 'object') {
    return [];
  }

  if (visited.has(value)) {
    return [];
  }

  visited.add(value);

  if (Array.isArray(value)) {
    if (value.some(looksLikeShiprocketPickupLocation)) {
      return value;
    }

    for (const item of value) {
      const nestedCollection = findShiprocketPickupLocationCollection(item, visited);

      if (nestedCollection.length > 0) {
        return nestedCollection;
      }
    }

    return [];
  }

  for (const nestedValue of Object.values(value)) {
    const nestedCollection = findShiprocketPickupLocationCollection(nestedValue, visited);

    if (nestedCollection.length > 0) {
      return nestedCollection;
    }
  }

  return [];
};

const shouldRetryShipmentLookup = (error) => (
  error?.statusCode === 404 &&
  String(error?.message || '').toLowerCase().includes('shipment not found')
);

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
  const providerOrderId = normalizeShiprocketRequestId(payload.providerOrderId || payload.order_id || payload.orderId);
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

  if (providerOrderId) {
    query.set('order_id', providerOrderId);
  }

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
    providerResponse.data?.courier_data ||
    providerResponse.courier_data ||
    providerResponse.courier_companies ||
    [];

  return {
    couriers: options.map(formatCourierOption).filter(Boolean),
    rawProviderResponse: providerResponse,
  };
};

const listPickupLocations = async () => {
  const providerResponse = await getJson(
    buildShiprocketUrl('/settings/company/pickup'),
    {
      headers: await getAuthHeaders(),
    },
  );
  const pickupLocations = providerResponse.data?.data ||
    providerResponse.data?.pickup_locations ||
    providerResponse.pickup_locations ||
    providerResponse.data?.shipping_address ||
    providerResponse.shipping_address ||
    providerResponse.data?.addresses ||
    providerResponse.addresses ||
    findShiprocketPickupLocationCollection(providerResponse);

  return {
    items: Array.isArray(pickupLocations)
      ? pickupLocations.map(formatShiprocketPickupLocation).filter((location) => location.id && location.pickupLocation)
      : [],
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

  const normalizedCourierId = normalizeShiprocketRequestId(courierCompanyId);
  const normalizedShipmentId = normalizeShiprocketRequestId(shipmentId);
  const requestBody = {
    courier_id: normalizedCourierId,
    shipment_id: normalizedShipmentId,
  };
  const retryDelaysMs = [0, 800, 1500];
  let lastError = null;

  for (let attempt = 0; attempt < retryDelaysMs.length; attempt += 1) {
    const retryDelayMs = retryDelaysMs[attempt];

    if (retryDelayMs > 0) {
      await sleep(retryDelayMs);
    }

    try {
      return await postJson(
        buildShiprocketUrl('/courier/assign/awb'),
        requestBody,
        {
          headers: await getAuthHeaders(),
        },
      );
    } catch (error) {
      lastError = error;

      if (!shouldRetryShipmentLookup(error) || attempt === retryDelaysMs.length - 1) {
        break;
      }
    }
  }

  if (lastError) {
    throw new ApiError(
      lastError.statusCode || 502,
      lastError.message || 'Shiprocket AWB assignment failed',
      {
        courierCompanyId: normalizedCourierId,
        providerResponse,
        requestBody,
        shipmentId: normalizedShipmentId,
        shiprocketError: lastError.details || null,
      },
    );
  }

  throw new ApiError(502, 'Shiprocket AWB assignment failed', {
    courierCompanyId: normalizedCourierId,
    providerResponse,
    requestBody,
    shipmentId: normalizedShipmentId,
  });
};

const createShipment = async ({ items, order, payload = {}, user }) => createProviderOrder({
  items,
  order,
  payload,
  user,
});

const createProviderOrder = async ({ items, order, payload = {}, user }) => {
  const createPayload = buildCreatePayload({ items, order, payload, user });

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

const assignAwbToShipment = async ({ payload = {}, shipment }) => {
  const courierCompanyId = payload.courierCompanyId || payload.courier_id || payload.courierId || '';

  if (!courierCompanyId) {
    throw new ApiError(400, 'Select a Shiprocket courier before creating AWB');
  }

  const awbResponse = await assignAwb({
    courierCompanyId,
    providerResponse: shipment?.rawProviderResponse || null,
    shipmentId: shipment?.providerShipmentId,
  });
  const providerStatus = awbResponse.status ||
    awbResponse.shipment_status ||
    shipment?.providerStatus ||
    'awb_assigned';
  const awbCode = getAwbCode(awbResponse, shipment?.rawProviderResponse);

  if (!awbCode) {
    throw new ApiError(
      502,
      getShiprocketErrorMessage(awbResponse, shipment?.rawProviderResponse) ||
        'Shiprocket did not return an AWB for the selected courier',
      {
        awbResponse,
        providerResponse: shipment?.rawProviderResponse || null,
      },
    );
  }

  return {
    awbCode,
    courierCharge: payload.courierCharge ?? payload.charge ?? null,
    courierCompanyId: courierCompanyId.toString(),
    courierName: getCourierName(awbResponse, shipment?.rawProviderResponse) || payload.courierName || '',
    estimatedDeliveryDays: payload.estimatedDeliveryDays || '',
    invoiceUrl: getShiprocketResponseData(awbResponse).invoice_url || '',
    labelUrl: getShiprocketResponseData(awbResponse).label_url || '',
    providerStatus: providerStatus || 'awb_assigned',
    rawProviderResponse: awbResponse,
    status: normalizeProviderStatus(providerStatus || 'awb_assigned'),
    trackingUrl: getTrackingUrl(awbResponse, shipment?.rawProviderResponse),
  };
};

const schedulePickupForShipment = async ({ payload = {}, shipment }) => {
  const shipmentId = normalizeShiprocketRequestId(shipment?.providerShipmentId);

  if (!shipmentId) {
    throw new ApiError(400, 'Shiprocket shipment id is required before scheduling pickup');
  }

  const requestBody = {
    shipment_id: buildShipmentIdArray(shipmentId, shipment?.rawProviderResponse),
  };

  if (payload.status) {
    requestBody.status = payload.status;
  }

  const providerResponse = await postJson(
    buildShiprocketUrl('/courier/generate/pickup'),
    requestBody,
    {
      headers: await getAuthHeaders(),
    },
  );

  const providerStatus = providerResponse.status ||
    providerResponse.shipment_status ||
    (providerResponse.pickup_generated ? 'pickup_scheduled' : 'pickup_pending');

  return {
    labelUrl: getShiprocketResponseData(providerResponse).label_url || shipment?.labelUrl || '',
    manifestUrl: getShiprocketResponseData(providerResponse).manifest_url || '',
    pickupScheduledAt: getShiprocketValue(providerResponse, ['pickup_scheduled_date']) || '',
    pickupTokenNumber: getShiprocketValue(providerResponse, ['pickup_token_number']) || '',
    providerStatus,
    rawProviderResponse: providerResponse,
    status: normalizeProviderStatus(providerStatus || 'pickup_scheduled'),
  };
};

const generateLabelForShipment = async ({ shipment }) => {
  const providerResponse = await postJson(
    buildShiprocketUrl('/courier/generate/label'),
    {
      shipment_id: buildShipmentIdArray(shipment?.providerShipmentId, shipment?.rawProviderResponse),
    },
    {
      headers: await getAuthHeaders(),
    },
  );
  const labelUrl = getShiprocketResponseData(providerResponse).label_url || '';

  if (!labelUrl) {
    throw new ApiError(
      502,
      getShiprocketErrorMessage(providerResponse) || 'Shiprocket did not return a label URL',
      {
        providerResponse,
        shipmentId: shipment?.providerShipmentId || '',
      },
    );
  }

  return {
    labelUrl,
    providerStatus: shipment?.providerStatus || 'label_created',
    rawProviderResponse: providerResponse,
    status: SHIPMENT_STATUS.LABEL_CREATED,
  };
};

const generateManifestForShipment = async ({ shipment }) => {
  const providerResponse = await postJson(
    buildShiprocketUrl('/manifests/generate'),
    {
      shipment_id: buildShipmentIdArray(shipment?.providerShipmentId, shipment?.rawProviderResponse),
    },
    {
      headers: await getAuthHeaders(),
    },
  );
  const manifestUrl = getShiprocketResponseData(providerResponse).manifest_url || '';

  if (!manifestUrl) {
    throw new ApiError(
      502,
      getShiprocketErrorMessage(providerResponse) || 'Shiprocket did not return a manifest URL',
      {
        providerResponse,
        shipmentId: shipment?.providerShipmentId || '',
      },
    );
  }

  return {
    manifestUrl,
    providerStatus: shipment?.providerStatus || 'manifest_generated',
    rawProviderResponse: providerResponse,
    status: shipment?.status || SHIPMENT_STATUS.PICKUP_SCHEDULED,
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
    buildShiprocketTrackingUrl(trackingKey),
    {
      headers: await getAuthHeaders(),
    },
  );

  return extractShiprocketTrackingSnapshot(providerResponse);
};

const testConnection = async () => {
  const token = await getAuthToken();

  return {
    authenticated: Boolean(token),
    pickupLocation: shiprocketConfig.pickupLocation || '',
  };
};

export default {
  assignAwbToShipment,
  cancelShipment,
  createProviderOrder,
  createShipment,
  extractTrackingSnapshot: extractShiprocketTrackingSnapshot,
  generateLabelForShipment,
  generateManifestForShipment,
  getCourierOptions,
  listPickupLocations,
  name: SHIPPING_PROVIDER.SHIPROCKET,
  schedulePickupForShipment,
  testConnection,
  trackShipment,
};
