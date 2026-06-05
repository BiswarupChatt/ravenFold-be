import ApiError from '@/common/errors/api.error.js';
import { SHIPMENT_STATUS, SHIPPING_PROVIDER } from '@/common/constants/shipping.constant.js';
import delhiveryConfig from '@/config/delhivery.config.js';
import { assertShippingProviderConfigured, getJson } from '@/modules/shipping/providers/provider.util.js';

const normalizeProviderStatus = (status = '') => {
  const normalized = String(status || '').toLowerCase();

  if (normalized.includes('delivered')) {
    return SHIPMENT_STATUS.DELIVERED;
  }

  if (normalized.includes('out for delivery')) {
    return SHIPMENT_STATUS.OUT_FOR_DELIVERY;
  }

  if (normalized.includes('manifested') || normalized.includes('pickup scheduled')) {
    return SHIPMENT_STATUS.PICKUP_SCHEDULED;
  }

  if (normalized.includes('picked')) {
    return SHIPMENT_STATUS.PICKED_UP;
  }

  if (normalized.includes('transit') || normalized.includes('dispatched')) {
    return SHIPMENT_STATUS.IN_TRANSIT;
  }

  if (normalized.includes('cancel')) {
    return SHIPMENT_STATUS.CANCELLED;
  }

  if (normalized.includes('rto')) {
    return SHIPMENT_STATUS.RTO;
  }

  if (normalized.includes('lost')) {
    return SHIPMENT_STATUS.LOST;
  }

  return SHIPMENT_STATUS.LABEL_CREATED;
};

const assertConfigured = () => {
  assertShippingProviderConfigured(
    delhiveryConfig.baseUrl && delhiveryConfig.token,
    SHIPPING_PROVIDER.DELHIVERY,
  );
};

const getAuthHeaders = () => {
  assertConfigured();

  return {
    Authorization: `Token ${delhiveryConfig.token}`,
  };
};

const safeJson = (text) => {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const postDelhiveryForm = async (path, data) => {
  const response = await fetch(`${delhiveryConfig.baseUrl.replace(/\/$/, '')}${path}`, {
    body: new URLSearchParams({
      data: JSON.stringify(data),
      format: 'json',
    }),
    headers: {
      ...getAuthHeaders(),
      'content-type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  });
  const payload = safeJson(await response.text());

  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      response.status || 502,
      payload?.rmk || payload?.message || payload?.error || 'Delhivery request failed',
      payload,
    );
  }

  return payload;
};

const buildPackage = (payload = {}) => ({
  breadth: Number(payload.breadth || 10),
  height: Number(payload.height || 5),
  length: Number(payload.length || 10),
  weight: Number(payload.weight || 0.5),
});

const buildShipmentPayload = ({ order, payload, user }) => {
  const address = order.shippingAddress || {};
  const packageDetails = buildPackage(payload);
  const pickupLocation = payload.pickupLocation || delhiveryConfig.pickupLocation;

  assertShippingProviderConfigured(pickupLocation, SHIPPING_PROVIDER.DELHIVERY);

  return {
    pickup_location: {
      name: pickupLocation,
    },
    shipments: [
      {
        add: [address.addressLine1, address.addressLine2].filter(Boolean).join(', '),
        address_type: address.addressType || 'home',
        city: address.city,
        cod_amount: order.paymentMethod === 'cod' ? Number(order.totalPayable || 0) : 0,
        country: address.country || 'India',
        dimensions: `${packageDetails.length}x${packageDetails.breadth}x${packageDetails.height}`,
        email: user?.email || payload.email || '',
        name: address.fullName,
        order: order.orderNumber,
        payment_mode: order.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
        phone: address.phone,
        pin: address.pincode,
        products_desc: payload.productDescription || `Order ${order.orderNumber}`,
        quantity: Number(order.totalQuantity || 1),
        shipment_length: packageDetails.length,
        shipment_width: packageDetails.breadth,
        shipment_height: packageDetails.height,
        state: address.state,
        total_amount: Number(order.totalPayable || 0),
        weight: packageDetails.weight,
      },
    ],
  };
};

const createShipment = async ({ order, payload = {}, user }) => {
  const providerPayload = buildShipmentPayload({ order, payload, user });
  const providerResponse = await postDelhiveryForm('/api/cmu/create.json', providerPayload);
  const packageResponse = providerResponse.packages?.[0] || providerResponse.package || {};
  const providerStatus = packageResponse.status || providerResponse.status || providerResponse.rmk || '';
  const awbCode = packageResponse.waybill || packageResponse.awb || providerResponse.waybill || '';

  return {
    awbCode,
    courierName: 'Delhivery',
    invoiceUrl: '',
    labelUrl: packageResponse.label || providerResponse.label || '',
    providerOrderId: packageResponse.order || order.orderNumber,
    providerShipmentId: packageResponse.refnum || packageResponse.waybill || awbCode,
    providerStatus,
    rawProviderResponse: providerResponse,
    status: normalizeProviderStatus(providerStatus || (awbCode ? 'manifested' : 'created')),
    trackingUrl: awbCode ? `${delhiveryConfig.baseUrl.replace(/\/$/, '')}/track/package/${encodeURIComponent(awbCode)}` : '',
  };
};

const cancelShipment = async ({ shipment }) => {
  if (!shipment?.awbCode) {
    throw new ApiError(400, 'Delhivery AWB is required to cancel this shipment');
  }

  const providerResponse = await postDelhiveryForm('/api/p/edit', {
    cancellation: 'true',
    waybill: shipment.awbCode,
  });

  return {
    providerStatus: providerResponse.status || 'cancelled',
    rawProviderResponse: providerResponse,
    status: SHIPMENT_STATUS.CANCELLED,
  };
};

const trackShipment = async ({ shipment }) => {
  if (!shipment?.awbCode) {
    throw new ApiError(400, 'Delhivery AWB is required to track this shipment');
  }

  const providerResponse = await getJson(
    `${delhiveryConfig.baseUrl.replace(/\/$/, '')}/api/v1/packages/json/?waybill=${encodeURIComponent(shipment.awbCode)}`,
    {
      headers: getAuthHeaders(),
    },
  );
  const shipmentData = providerResponse.ShipmentData?.[0]?.Shipment || {};
  const providerStatus = shipmentData.Status?.Status || shipmentData.status || '';

  return {
    providerStatus,
    rawProviderResponse: providerResponse,
    status: normalizeProviderStatus(providerStatus),
  };
};

export default {
  cancelShipment,
  createShipment,
  name: SHIPPING_PROVIDER.DELHIVERY,
  trackShipment,
};
