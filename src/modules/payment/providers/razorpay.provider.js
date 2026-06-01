import ApiError from '@/common/errors/api.error.js';
import { PAYMENT_ATTEMPT_STATUS, PAYMENT_METHOD, PAYMENT_PROVIDER } from '@/common/constants/payment.constant.js';
import paymentConfig from '@/config/payment.config.js';
import {
  assertProviderConfigured,
  encodeBasicAuth,
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

const normalizeMethod = (method = '') => {
  const normalizedMethod = String(method || '').toLowerCase();

  if (Object.values(PAYMENT_METHOD).includes(normalizedMethod)) {
    return normalizedMethod;
  }

  return PAYMENT_METHOD.UNKNOWN;
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
        name: user?.name || order.shippingAddress?.fullName || '',
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
  createPaymentSession,
  handleWebhook,
  name: PAYMENT_PROVIDER.RAZORPAY,
  verifyPayment,
};
