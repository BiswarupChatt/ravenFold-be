import ApiError from '@/common/errors/api.error.js';
import { PAYMENT_ATTEMPT_STATUS, PAYMENT_METHOD, PAYMENT_PROVIDER } from '@/common/constants/payment.constant.js';
import { getDisplayName } from '@/common/utils/user-name.util.js';
import paymentConfig from '@/config/payment.config.js';
import {
  assertProviderConfigured,
  encodeBasicAuth,
  getJson,
  hmacSha256,
  postJson,
  timingSafeEqual,
} from '@/modules/payment/providers/provider.util.js';

const RAZORPAY_API_BASE_URL = 'https://api.razorpay.com/v1';
const BUSINESS_NAME = 'RavenFold';

const getAuthHeader = () => {
  const { keyId, keySecret } = paymentConfig.razorpay;

  assertProviderConfigured(keyId && keySecret, PAYMENT_PROVIDER.RAZORPAY);

  return `Basic ${encodeBasicAuth(keyId, keySecret)}`;
};

const toSubunitAmount = (amount) => Math.round(Number(amount || 0) * 100);

const normalizeRefundStatus = (status = '') => {
  const normalizedStatus = String(status || '').toLowerCase();

  if (normalizedStatus === 'processed') {
    return 'processed';
  }

  if (normalizedStatus === 'failed') {
    return 'failed';
  }

  return 'pending';
};

const normalizeMethod = (method = '') => {
  const normalizedMethod = String(method || '').toLowerCase();

  if (Object.values(PAYMENT_METHOD).includes(normalizedMethod)) {
    return normalizedMethod;
  }

  return PAYMENT_METHOD.UNKNOWN;
};

const normalizeStatus = (status = '') => {
  const normalizedStatus = String(status || '').toLowerCase();

  if (normalizedStatus === 'captured') {
    return PAYMENT_ATTEMPT_STATUS.PAID;
  }

  if (normalizedStatus === 'authorized') {
    return PAYMENT_ATTEMPT_STATUS.AUTHORIZED;
  }

  if (normalizedStatus === 'failed') {
    return PAYMENT_ATTEMPT_STATUS.FAILED;
  }

  if (normalizedStatus === 'created') {
    return PAYMENT_ATTEMPT_STATUS.CREATED;
  }

  return PAYMENT_ATTEMPT_STATUS.PENDING;
};

const createPaymentSession = async ({ order, paymentAttempt, user }) => {
  const amount = toSubunitAmount(order.totalPayable);
  const currency = order.currency || 'INR';
  const providerOrder = await postJson(
    `${RAZORPAY_API_BASE_URL}/orders`,
    {
      amount,
      currency,
      notes: {
        internal_order_id: order._id.toString(),
        order_number: order.orderNumber,
        payment_attempt_id: paymentAttempt._id.toString(),
      },
      receipt: order.orderNumber.slice(0, 40),
    },
    {
      headers: {
        Authorization: getAuthHeader(),
      },
    },
  );

  return {
    checkoutPayload: {
      amount: providerOrder.amount,
      currency: providerOrder.currency,
      description: `Order ${order.orderNumber}`,
      key: paymentConfig.razorpay.keyId,
      name: BUSINESS_NAME,
      notes: providerOrder.notes || {},
      order_id: providerOrder.id,
      prefill: {
        contact: user?.phone || order.shippingAddress?.phone || '',
        email: user?.email || '',
        name: getDisplayName(user) || order.shippingAddress?.fullName || '',
      },
      theme: {
        color: '#1e2952',
      },
    },
    providerOrderId: providerOrder.id,
    providerPaymentId: '',
    providerSessionId: '',
    rawCreateResponse: providerOrder,
    status: PAYMENT_ATTEMPT_STATUS.CREATED,
  };
};

const createRefund = async ({ amount, payment, reason = '' }) => {
  assertProviderConfigured(paymentConfig.razorpay.keyId && paymentConfig.razorpay.keySecret, PAYMENT_PROVIDER.RAZORPAY);

  if (!payment?.providerPaymentId) {
    throw new ApiError(400, 'Razorpay payment id is required to create a refund');
  }

  const providerRefund = await postJson(
    `${RAZORPAY_API_BASE_URL}/payments/${encodeURIComponent(payment.providerPaymentId)}/refund`,
    {
      amount: toSubunitAmount(amount),
      notes: {
        internal_order_id: payment.orderId.toString(),
        internal_payment_id: payment._id.toString(),
        reason,
      },
    },
    {
      headers: {
        Authorization: getAuthHeader(),
      },
    },
  );

  return {
    failureReason: providerRefund.error_description || '',
    providerRefundId: providerRefund.id || '',
    rawCreateResponse: providerRefund,
    status: normalizeRefundStatus(providerRefund.status),
  };
};

const verifyPayment = async ({ payload, paymentAttempt }) => {
  assertProviderConfigured(paymentConfig.razorpay.keySecret, PAYMENT_PROVIDER.RAZORPAY);

  const razorpayOrderId = payload.razorpay_order_id || payload.providerOrderId;
  const razorpayPaymentId = payload.razorpay_payment_id || payload.providerPaymentId;
  const razorpaySignature = payload.razorpay_signature || payload.signature;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new ApiError(400, 'Razorpay verification payload is incomplete');
  }

  if (paymentAttempt.providerOrderId && razorpayOrderId !== paymentAttempt.providerOrderId) {
    throw new ApiError(400, 'Razorpay order id does not match this payment attempt');
  }

  const expectedSignature = hmacSha256(`${razorpayOrderId}|${razorpayPaymentId}`, paymentConfig.razorpay.keySecret);

  if (!timingSafeEqual(expectedSignature, razorpaySignature)) {
    throw new ApiError(400, 'Razorpay payment signature verification failed');
  }

  return {
    failureReason: '',
    paymentMethod: normalizeMethod(payload.method),
    providerOrderId: razorpayOrderId,
    providerPaymentId: razorpayPaymentId,
    rawVerifyResponse: payload,
    status: PAYMENT_ATTEMPT_STATUS.PAID,
  };
};

const fetchPaymentStatus = async ({ paymentAttempt }) => {
  assertProviderConfigured(paymentConfig.razorpay.keyId && paymentConfig.razorpay.keySecret, PAYMENT_PROVIDER.RAZORPAY);

  if (!paymentAttempt?.providerOrderId) {
    throw new ApiError(400, 'Razorpay order id is required to fetch payment status');
  }

  const statusResponse = await getJson(
    `${RAZORPAY_API_BASE_URL}/orders/${encodeURIComponent(paymentAttempt.providerOrderId)}/payments`,
    {
      headers: {
        Authorization: getAuthHeader(),
      },
    },
  );
  const payments = Array.isArray(statusResponse?.items) ? statusResponse.items : [];
  const latestPayment = payments
    .slice()
    .sort((left, right) => Number(right?.created_at || 0) - Number(left?.created_at || 0))[0] || null;

  if (!latestPayment) {
    return {
      failureReason: '',
      paymentMethod: PAYMENT_METHOD.UNKNOWN,
      providerOrderId: paymentAttempt.providerOrderId,
      providerPaymentId: '',
      rawStatusResponse: statusResponse,
      status: PAYMENT_ATTEMPT_STATUS.PENDING,
    };
  }

  return {
    failureReason: latestPayment.error_description || latestPayment.error_reason || '',
    paymentMethod: normalizeMethod(latestPayment.method),
    providerOrderId: latestPayment.order_id || paymentAttempt.providerOrderId,
    providerPaymentId: latestPayment.id || '',
    rawStatusResponse: statusResponse,
    status: normalizeStatus(latestPayment.status),
  };
};

const handleWebhook = ({ headers, rawBody }) => {
  assertProviderConfigured(paymentConfig.razorpay.webhookSecret, PAYMENT_PROVIDER.RAZORPAY);

  const signature = headers['x-razorpay-signature'];
  const expectedSignature = hmacSha256(rawBody || '', paymentConfig.razorpay.webhookSecret);

  if (!signature || !timingSafeEqual(expectedSignature, signature)) {
    throw new ApiError(400, 'Invalid Razorpay webhook signature');
  }

  const event = JSON.parse(rawBody || '{}');
  const payment = event.payload?.payment?.entity || {};
  const order = event.payload?.order?.entity || {};
  const eventName = event.event || '';
  const providerOrderId = payment.order_id || order.id || '';
  const providerPaymentId = payment.id || '';
  const isPaid = ['payment.captured', 'order.paid'].includes(eventName);
  const isFailed = ['payment.failed'].includes(eventName);

  return {
    eventName,
    failureReason: payment.error_description || payment.error_reason || '',
    paymentMethod: normalizeMethod(payment.method),
    providerOrderId,
    providerPaymentId,
    rawStatusResponse: event,
    status: isPaid
      ? PAYMENT_ATTEMPT_STATUS.PAID
      : isFailed
        ? PAYMENT_ATTEMPT_STATUS.FAILED
        : PAYMENT_ATTEMPT_STATUS.PENDING,
  };
};

export default {
  createRefund,
  createPaymentSession,
  fetchPaymentStatus,
  handleWebhook,
  name: PAYMENT_PROVIDER.RAZORPAY,
  verifyPayment,
};
