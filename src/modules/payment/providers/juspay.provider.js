import ApiError from '@/common/errors/api.error.js';
import { PAYMENT_ATTEMPT_STATUS, PAYMENT_METHOD, PAYMENT_PROVIDER } from '@/common/constants/payment.constant.js';
import paymentConfig from '@/config/payment.config.js';
import {
  assertProviderConfigured,
  encodeBasicAuth,
  getJson,
  postJson,
} from '@/modules/payment/providers/provider.util.js';

const normalizeMethod = (method = '') => {
  const normalizedMethod = String(method || '').toLowerCase();

  if (Object.values(PAYMENT_METHOD).includes(normalizedMethod)) {
    return normalizedMethod;
  }

  return PAYMENT_METHOD.UNKNOWN;
};

const normalizeStatus = (status = '') => {
  const normalizedStatus = String(status || '').toUpperCase();

  if (['CHARGED', 'COD_INITIATED'].includes(normalizedStatus)) {
    return PAYMENT_ATTEMPT_STATUS.PAID;
  }

  if (['AUTHORIZATION_FAILED', 'AUTHENTICATION_FAILED', 'JUSPAY_DECLINED', 'FAILURE'].includes(normalizedStatus)) {
    return PAYMENT_ATTEMPT_STATUS.FAILED;
  }

  if (['PENDING_VBV', 'PENDING', 'STARTED'].includes(normalizedStatus)) {
    return PAYMENT_ATTEMPT_STATUS.PENDING;
  }

  return PAYMENT_ATTEMPT_STATUS.PENDING;
};

const getAuthHeader = () => {
  const { apiKey } = paymentConfig.juspay;

  assertProviderConfigured(apiKey, PAYMENT_PROVIDER.JUSPAY);

  return `Basic ${encodeBasicAuth(apiKey)}`;
};

const createPaymentSession = async ({ order, paymentAttempt, user }) => {
  const { baseUrl, merchantId } = paymentConfig.juspay;

  assertProviderConfigured(baseUrl && merchantId, PAYMENT_PROVIDER.JUSPAY);

  const providerOrderId = `${order.orderNumber}-${paymentAttempt._id.toString().slice(-6)}`;
  const providerOrder = await postJson(
    `${baseUrl.replace(/\/$/, '')}/orders`,
    {
      amount: String(order.totalPayable),
      customer_email: user?.email || '',
      customer_id: order.userId.toString(),
      customer_phone: user?.phone || order.shippingAddress?.phone || '',
      merchant_id: merchantId,
      order_id: providerOrderId,
      udf1: order._id.toString(),
      udf2: order.orderNumber,
      udf3: paymentAttempt._id.toString(),
    },
    {
      headers: {
        Authorization: getAuthHeader(),
        'x-merchantid': merchantId,
      },
    },
  );

  return {
    checkoutPayload: providerOrder,
    providerOrderId,
    providerPaymentId: '',
    providerSessionId: providerOrder.sdk_payload?.payload?.client_auth_token || providerOrder.client_auth_token || '',
    rawCreateResponse: providerOrder,
    status: PAYMENT_ATTEMPT_STATUS.CREATED,
  };
};

const createRefund = async () => {
  throw new ApiError(501, 'Juspay refunds are not wired yet');
};

const fetchPaymentStatus = async ({ paymentAttempt }) => {
  const { baseUrl, merchantId } = paymentConfig.juspay;
  const statusResponse = await getJson(
    `${baseUrl.replace(/\/$/, '')}/orders/${encodeURIComponent(paymentAttempt.providerOrderId)}`,
    {
      headers: {
        Authorization: getAuthHeader(),
        'x-merchantid': merchantId,
      },
    },
  );

  return {
    failureReason: statusResponse.payment_gateway_response?.resp_message || '',
    paymentMethod: normalizeMethod(statusResponse.payment_method || statusResponse.payment_method_type),
    providerOrderId: statusResponse.order_id || paymentAttempt.providerOrderId,
    providerPaymentId: statusResponse.txn_id || statusResponse.id || '',
    rawStatusResponse: statusResponse,
    status: normalizeStatus(statusResponse.status),
  };
};

const verifyPayment = async ({ paymentAttempt }) => {
  return fetchPaymentStatus({ paymentAttempt });
};

const handleWebhook = ({ body }) => {
  const providerOrderId = body.order_id || body.content?.order?.order_id || '';

  if (!providerOrderId) {
    throw new ApiError(400, 'Juspay webhook payload is missing order_id');
  }

  return {
    eventName: body.event_name || body.event || '',
    failureReason: body.payment_gateway_response?.resp_message || '',
    paymentMethod: normalizeMethod(body.payment_method || body.payment_method_type),
    providerOrderId,
    providerPaymentId: body.txn_id || body.id || '',
    rawStatusResponse: body,
    status: normalizeStatus(body.status || body.content?.order?.status),
  };
};

export default {
  createRefund,
  createPaymentSession,
  fetchPaymentStatus,
  handleWebhook,
  name: PAYMENT_PROVIDER.JUSPAY,
  verifyPayment,
};
