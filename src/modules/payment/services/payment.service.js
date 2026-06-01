import ApiError from '@/common/errors/api.error.js';
import { PAYMENT_STATUS, ORDER_STATUS } from '@/common/constants/order.constant.js';
import {
  PAYMENT_ATTEMPT_STATUS,
  PAYMENT_METHOD,
  PAYMENT_PROVIDER,
  PAYMENT_RECORD_STATUS,
  REFUND_STATUS,
} from '@/common/constants/payment.constant.js';
import paymentConfig from '@/config/payment.config.js';
import {
  assertDatabaseReady,
  getDocumentId,
  normalizeObjectId,
  normalizeText,
} from '@/common/utils/service.util.js';
import OrderStatusHistory from '@/modules/order/models/order-status-history.model.js';
import Order from '@/modules/order/models/order.model.js';
import PaymentAttempt from '@/modules/payment/models/payment-attempt.model.js';
import Payment from '@/modules/payment/models/payment.model.js';
import { getPaymentProvider, listPaymentProviders } from '@/modules/payment/providers/payment-provider.registry.js';
import User from '@/modules/users/models/user.model.js';

const normalizeUserId = (actor = null) => {
  try {
    if (!actor?.id) {
      throw new Error('Missing actor id');
    }

    normalizeObjectId(actor.id, 'authenticated user');
  } catch {
    throw new ApiError(401, 'Authentication required');
  }

  return actor.id;
};

const normalizeProvider = (providerName = '') => {
  const normalizedProvider = normalizeText(providerName || paymentConfig.defaultProvider).toLowerCase();

  if (!Object.values(PAYMENT_PROVIDER).includes(normalizedProvider)) {
    throw new ApiError(400, `provider must be one of: ${Object.values(PAYMENT_PROVIDER).join(', ')}`);
  }

  return normalizedProvider;
};

const formatPaymentAttempt = (attempt) => ({
  amount: attempt.amount,
  createdAt: attempt.createdAt,
  currency: attempt.currency,
  failureReason: attempt.failureReason || '',
  id: attempt.id || attempt._id?.toString(),
  orderId: getDocumentId(attempt.orderId),
  paymentMethod: attempt.paymentMethod || PAYMENT_METHOD.UNKNOWN,
  provider: attempt.provider,
  providerOrderId: attempt.providerOrderId || '',
  providerPaymentId: attempt.providerPaymentId || '',
  providerSessionId: attempt.providerSessionId || '',
  status: attempt.status,
  updatedAt: attempt.updatedAt,
  userId: getDocumentId(attempt.userId),
});

const getStatusData = () => ({
  attemptStatuses: Object.values(PAYMENT_ATTEMPT_STATUS),
  defaultProvider: paymentConfig.defaultProvider,
  methods: Object.values(PAYMENT_METHOD),
  module: 'payments',
  paymentStatuses: Object.values(PAYMENT_RECORD_STATUS),
  providers: listPaymentProviders(),
  refundStatuses: Object.values(REFUND_STATUS),
});

const getUser = async (userId) => {
  return User.findById(userId).select('name email phone').lean().exec();
};

const getPayableOrder = async (actor, orderId) => {
  const userId = normalizeUserId(actor);
  const normalizedOrderId = normalizeObjectId(orderId, 'order id');
  const order = await Order.findOne({
    _id: normalizedOrderId,
    userId,
  }).exec();

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if ([PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED, PAYMENT_STATUS.REFUNDED].includes(order.paymentStatus)) {
    throw new ApiError(409, 'Order is already paid');
  }

  if ([ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED].includes(order.status)) {
    throw new ApiError(409, 'Payment cannot be started for this order');
  }

  if (Number(order.totalPayable || 0) <= 0) {
    throw new ApiError(400, 'Order total must be greater than zero');
  }

  return {
    order,
    userId,
  };
};

const createPaymentSession = async (actor, payload = {}) => {
  assertDatabaseReady();
  const providerName = normalizeProvider(payload.provider);
  const provider = getPaymentProvider(providerName);
  const { order, userId } = await getPayableOrder(actor, payload.orderId);
  const user = await getUser(userId);
  const paymentAttempt = await PaymentAttempt.create({
    amount: order.totalPayable,
    currency: order.currency || 'INR',
    idempotencyKey: normalizeText(payload.idempotencyKey),
    orderId: order._id,
    provider: providerName,
    status: PAYMENT_ATTEMPT_STATUS.CREATED,
    userId,
  });

  try {
    const session = await provider.createPaymentSession({
      order,
      paymentAttempt,
      user,
    });

    paymentAttempt.providerOrderId = session.providerOrderId || '';
    paymentAttempt.providerPaymentId = session.providerPaymentId || '';
    paymentAttempt.providerSessionId = session.providerSessionId || '';
    paymentAttempt.rawCreateResponse = session.rawCreateResponse || null;
    paymentAttempt.status = session.status || PAYMENT_ATTEMPT_STATUS.CREATED;
    await paymentAttempt.save();

    order.paymentFailureReason = '';
    order.paymentProvider = providerName;
    order.providerOrderId = paymentAttempt.providerOrderId;
    await order.save();

    return {
      checkoutPayload: session.checkoutPayload || {},
      paymentAttempt: formatPaymentAttempt(paymentAttempt),
      provider: providerName,
    };
  } catch (error) {
    paymentAttempt.failureReason = error.message || 'Payment session creation failed';
    paymentAttempt.status = PAYMENT_ATTEMPT_STATUS.FAILED;
    await paymentAttempt.save();
    throw error;
  }
};

const getOwnedPaymentAttempt = async (actor, paymentAttemptId) => {
  const userId = normalizeUserId(actor);
  const normalizedAttemptId = normalizeObjectId(paymentAttemptId, 'payment attempt id');
  const paymentAttempt = await PaymentAttempt.findOne({
    _id: normalizedAttemptId,
    userId,
  }).exec();

  if (!paymentAttempt) {
    throw new ApiError(404, 'Payment attempt not found');
  }

  return paymentAttempt;
};

const appendOrderStatusHistory = async ({ actorId, fromPaymentStatus, fromStatus, note, order }) => {
  await OrderStatusHistory.create({
    createdBy: actorId || order.userId,
    fromPaymentStatus,
    fromStatus,
    note,
    orderId: order._id,
    toPaymentStatus: order.paymentStatus,
    toStatus: order.status,
  });
};

const createOrUpdatePaymentRecord = async ({ order, paymentAttempt, result }) => {
  if (!paymentAttempt.providerPaymentId) {
    return null;
  }

  return Payment.findOneAndUpdate(
    {
      paymentAttemptId: paymentAttempt._id,
    },
    {
      $set: {
        paymentMethod: paymentAttempt.paymentMethod || PAYMENT_METHOD.UNKNOWN,
        providerOrderId: paymentAttempt.providerOrderId,
        providerPaymentId: paymentAttempt.providerPaymentId,
        rawProviderResponse: result.rawVerifyResponse || result.rawStatusResponse || null,
        status: PAYMENT_RECORD_STATUS.PAID,
      },
      $setOnInsert: {
        amount: paymentAttempt.amount,
        currency: paymentAttempt.currency || order.currency || 'INR',
        orderId: order._id,
        paidAt: order.paidAt || new Date(),
        paymentAttemptId: paymentAttempt._id,
        provider: paymentAttempt.provider,
        refundedAmount: 0,
        userId: paymentAttempt.userId,
      },
    },
    {
      new: true,
      setDefaultsOnInsert: true,
      upsert: true,
    },
  ).exec();
};

const applyPaymentResultToOrder = async ({ actorId = null, order, paymentAttempt, result }) => {
  const fromStatus = order.status;
  const fromPaymentStatus = order.paymentStatus;

  paymentAttempt.failureReason = result.failureReason || '';
  paymentAttempt.paymentMethod = result.paymentMethod || paymentAttempt.paymentMethod || PAYMENT_METHOD.UNKNOWN;
  paymentAttempt.providerOrderId = result.providerOrderId || paymentAttempt.providerOrderId || '';
  paymentAttempt.providerPaymentId = result.providerPaymentId || paymentAttempt.providerPaymentId || '';
  paymentAttempt.rawVerifyResponse = result.rawVerifyResponse || paymentAttempt.rawVerifyResponse || null;
  paymentAttempt.rawStatusResponse = result.rawStatusResponse || paymentAttempt.rawStatusResponse || null;
  paymentAttempt.status = result.status || paymentAttempt.status;
  await paymentAttempt.save();

  if (result.status === PAYMENT_ATTEMPT_STATUS.PAID) {
    order.paidAt = order.paidAt || new Date();
    order.paymentFailureReason = '';
    order.paymentMethod = paymentAttempt.paymentMethod || PAYMENT_METHOD.UNKNOWN;
    order.paymentProvider = paymentAttempt.provider;
    order.paymentStatus = PAYMENT_STATUS.PAID;
    order.providerOrderId = paymentAttempt.providerOrderId;
    order.providerPaymentId = paymentAttempt.providerPaymentId;

    if (order.status === ORDER_STATUS.PENDING) {
      order.status = ORDER_STATUS.CONFIRMED;
    }

    await createOrUpdatePaymentRecord({
      order,
      paymentAttempt,
      result,
    });
  }

  if (result.status === PAYMENT_ATTEMPT_STATUS.FAILED && order.paymentStatus !== PAYMENT_STATUS.PAID) {
    order.paymentFailureReason = paymentAttempt.failureReason || 'Payment failed';
    order.paymentMethod = paymentAttempt.paymentMethod || PAYMENT_METHOD.UNKNOWN;
    order.paymentProvider = paymentAttempt.provider;
    order.paymentStatus = PAYMENT_STATUS.FAILED;
    order.providerOrderId = paymentAttempt.providerOrderId;
    order.providerPaymentId = paymentAttempt.providerPaymentId;
  }

  await order.save();

  if (fromStatus !== order.status || fromPaymentStatus !== order.paymentStatus) {
    await appendOrderStatusHistory({
      actorId,
      fromPaymentStatus,
      fromStatus,
      note: `Payment ${paymentAttempt.status} via ${paymentAttempt.provider}`,
      order,
    });
  }
};

const verifyPaymentAttempt = async (actor, paymentAttemptId, payload = {}) => {
  assertDatabaseReady();
  const paymentAttempt = await getOwnedPaymentAttempt(actor, paymentAttemptId);
  const provider = getPaymentProvider(paymentAttempt.provider);
  const order = await Order.findOne({
    _id: paymentAttempt.orderId,
    userId: paymentAttempt.userId,
  }).exec();

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (paymentAttempt.status === PAYMENT_ATTEMPT_STATUS.PAID && order.paymentStatus === PAYMENT_STATUS.PAID) {
    return {
      orderId: order._id.toString(),
      paymentAttempt: formatPaymentAttempt(paymentAttempt),
      paymentStatus: order.paymentStatus,
    };
  }

  const result = await provider.verifyPayment({
    order,
    payload,
    paymentAttempt,
  });

  await applyPaymentResultToOrder({
    actorId: paymentAttempt.userId,
    order,
    paymentAttempt,
    result,
  });

  return {
    orderId: order._id.toString(),
    paymentAttempt: formatPaymentAttempt(paymentAttempt),
    paymentStatus: order.paymentStatus,
  };
};

const refreshPaymentAttemptStatus = async (actor, paymentAttemptId) => {
  assertDatabaseReady();
  const paymentAttempt = await getOwnedPaymentAttempt(actor, paymentAttemptId);
  const provider = getPaymentProvider(paymentAttempt.provider);
  const order = await Order.findOne({
    _id: paymentAttempt.orderId,
    userId: paymentAttempt.userId,
  }).exec();

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (provider.fetchPaymentStatus) {
    const result = await provider.fetchPaymentStatus({ order, paymentAttempt });

    await applyPaymentResultToOrder({
      actorId: paymentAttempt.userId,
      order,
      paymentAttempt,
      result,
    });
  }

  return {
    orderId: order._id.toString(),
    paymentAttempt: formatPaymentAttempt(paymentAttempt),
    paymentStatus: order.paymentStatus,
  };
};

const applyWebhookResult = async (providerName, result) => {
  const paymentAttempt = await PaymentAttempt.findOne({
    provider: providerName,
    providerOrderId: result.providerOrderId,
  }).sort({ createdAt: -1 }).exec();

  if (!paymentAttempt) {
    return {
      matched: false,
      providerOrderId: result.providerOrderId,
    };
  }

  const order = await Order.findById(paymentAttempt.orderId).exec();

  if (!order) {
    return {
      matched: false,
      paymentAttempt: formatPaymentAttempt(paymentAttempt),
    };
  }

  await applyPaymentResultToOrder({
    order,
    paymentAttempt,
    result,
  });

  return {
    matched: true,
    orderId: order._id.toString(),
    paymentAttempt: formatPaymentAttempt(paymentAttempt),
    paymentStatus: order.paymentStatus,
  };
};

const handleProviderWebhook = async (providerName, req) => {
  assertDatabaseReady();
  const normalizedProvider = normalizeProvider(providerName);
  const provider = getPaymentProvider(normalizedProvider);
  const result = provider.handleWebhook({
    body: req.body,
    headers: req.headers,
    rawBody: req.rawBody || JSON.stringify(req.body || {}),
  });

  return applyWebhookResult(normalizedProvider, result);
};

const processWebhook = async (payload) => ({
  received: Boolean(payload),
});

export {
  createPaymentSession,
  getStatusData,
  handleProviderWebhook,
  processWebhook,
  refreshPaymentAttemptStatus,
  verifyPaymentAttempt,
};

export default {
  createPaymentSession,
  getStatusData,
  handleProviderWebhook,
  processWebhook,
  refreshPaymentAttemptStatus,
  verifyPaymentAttempt,
};
