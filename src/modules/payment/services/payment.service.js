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
import { getPagination } from '@/common/utils/pagination.util.js';
import {
  assertDatabaseReady,
  getDocumentId,
  isValidObjectId,
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

const normalizeRecordedAttemptStatus = (statusValue = '') => {
  const status = normalizeText(statusValue).toLowerCase();
  const allowedStatuses = [PAYMENT_ATTEMPT_STATUS.CANCELLED, PAYMENT_ATTEMPT_STATUS.FAILED];

  if (!allowedStatuses.includes(status)) {
    throw new ApiError(400, `status must be one of: ${allowedStatuses.join(', ')}`);
  }

  return status;
};

const normalizeOptionalPaymentMethod = (methodValue = '') => {
  const method = normalizeText(methodValue).toLowerCase();

  if (!method) {
    return '';
  }

  return Object.values(PAYMENT_METHOD).includes(method) ? method : '';
};

const assertStorefrontCheckoutSupport = (providerName) => {
  if (providerName === PAYMENT_PROVIDER.JUSPAY) {
    throw new ApiError(503, 'Juspay checkout is not enabled in the storefront yet');
  }
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

const formatUserSummary = (user) => {
  if (!user || typeof user !== 'object' || !user._id) {
    return null;
  }

  return {
    avatar: user.avatar || '',
    email: user.email || '',
    id: user._id.toString(),
    name: user.name || '',
    phone: user.phone || '',
  };
};

const formatAddressSnapshot = (address) => {
  if (!address || typeof address !== 'object') {
    return null;
  }

  return {
    addressLine1: address.addressLine1 || '',
    addressLine2: address.addressLine2 || '',
    addressType: address.addressType || '',
    city: address.city || '',
    country: address.country || '',
    fullName: address.fullName || '',
    phone: address.phone || '',
    pincode: address.pincode || '',
    state: address.state || '',
  };
};

const formatOrderSummary = (order) => {
  if (!order || typeof order !== 'object' || !order._id) {
    return null;
  }

  return {
    currency: order.currency || 'INR',
    id: order._id.toString(),
    orderNumber: order.orderNumber || '',
    paidAt: order.paidAt,
    paymentStatus: order.paymentStatus || '',
    placedAt: order.placedAt,
    shippingAddress: formatAddressSnapshot(order.shippingAddress),
    status: order.status || '',
    totalPayable: order.totalPayable,
    user: formatUserSummary(order.userId),
  };
};

const formatAdminPaymentAttempt = (attempt) => ({
  ...formatPaymentAttempt(attempt),
  order: formatOrderSummary(attempt.orderId),
  user: formatUserSummary(attempt.userId),
});

const formatAdminPayment = (payment) => ({
  amount: payment.amount,
  createdAt: payment.createdAt,
  currency: payment.currency,
  id: payment.id || payment._id?.toString(),
  order: formatOrderSummary(payment.orderId),
  orderId: getDocumentId(payment.orderId),
  paidAt: payment.paidAt,
  paymentAttemptId: getDocumentId(payment.paymentAttemptId),
  paymentMethod: payment.paymentMethod || PAYMENT_METHOD.UNKNOWN,
  provider: payment.provider,
  providerOrderId: payment.providerOrderId || '',
  providerPaymentId: payment.providerPaymentId || '',
  refundableAmount: Number(Math.max(Number(payment.amount || 0) - Number(payment.refundedAmount || 0), 0).toFixed(2)),
  refundedAmount: payment.refundedAmount || 0,
  status: payment.status,
  updatedAt: payment.updatedAt,
  user: formatUserSummary(payment.userId),
  userId: getDocumentId(payment.userId),
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

const normalizeAdminProvider = (providerName = '') => {
  const provider = normalizeText(providerName).toLowerCase();

  if (!provider || provider === 'all') {
    return '';
  }

  if (!Object.values(PAYMENT_PROVIDER).includes(provider)) {
    throw new ApiError(400, `provider must be one of: ${Object.values(PAYMENT_PROVIDER).join(', ')}`);
  }

  return provider;
};

const normalizeAdminPaymentStatus = (statusValue = '') => {
  const status = normalizeText(statusValue).toLowerCase();

  if (!status || status === 'all') {
    return '';
  }

  if (!Object.values(PAYMENT_RECORD_STATUS).includes(status)) {
    throw new ApiError(400, `status must be one of: ${Object.values(PAYMENT_RECORD_STATUS).join(', ')}`);
  }

  return status;
};

const normalizeAdminAttemptStatus = (statusValue = '') => {
  const status = normalizeText(statusValue).toLowerCase();

  if (!status || status === 'all') {
    return '';
  }

  if (!Object.values(PAYMENT_ATTEMPT_STATUS).includes(status)) {
    throw new ApiError(400, `status must be one of: ${Object.values(PAYMENT_ATTEMPT_STATUS).join(', ')}`);
  }

  return status;
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildAdminPaymentSearchFilter = async (search = '', fields = []) => {
  const searchValue = normalizeText(search);

  if (!searchValue) {
    return null;
  }

  const searchRegex = new RegExp(escapeRegex(searchValue), 'i');
  const conditions = fields.map((field) => ({ [field]: searchRegex }));
  const objectIdSearch = isValidObjectId(searchValue);
  const [users, orders] = await Promise.all([
    User.find({
      $or: [
        { email: searchRegex },
        { name: searchRegex },
        { phone: searchRegex },
      ],
    }).select('_id').limit(100).lean().exec(),
    Order.find({
      $or: [
        { orderNumber: searchRegex },
        { 'shippingAddress.fullName': searchRegex },
        { 'shippingAddress.phone': searchRegex },
        ...(objectIdSearch ? [{ _id: searchValue }] : []),
      ],
    }).select('_id').limit(100).lean().exec(),
  ]);
  const userIds = users.map((user) => user._id);
  const orderIds = orders.map((order) => order._id);

  if (objectIdSearch) {
    conditions.push({ _id: searchValue });
    conditions.push({ orderId: searchValue });
    conditions.push({ userId: searchValue });
  }

  if (userIds.length > 0) {
    conditions.push({ userId: { $in: userIds } });
  }

  if (orderIds.length > 0) {
    conditions.push({ orderId: { $in: orderIds } });
  }

  if (conditions.length === 0) {
    return null;
  }

  return {
    $or: conditions,
  };
};

const listAdminPayments = async (query = {}) => {
  assertDatabaseReady();
  const { limit, page, skip } = getPagination(query);
  const filter = {};
  const provider = normalizeAdminProvider(query.provider);
  const status = normalizeAdminPaymentStatus(query.status);
  const searchFilter = await buildAdminPaymentSearchFilter(query.search, ['providerOrderId', 'providerPaymentId']);

  if (provider) {
    filter.provider = provider;
  }

  if (status) {
    filter.status = status;
  }

  if (query.orderId) {
    filter.orderId = normalizeObjectId(query.orderId, 'order id');
  }

  if (query.userId) {
    filter.userId = normalizeObjectId(query.userId, 'user id');
  }

  if (searchFilter) {
    Object.assign(filter, searchFilter);
  }

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate({
        path: 'orderId',
        populate: { path: 'userId', select: 'name email phone avatar' },
        select: 'currency orderNumber paidAt paymentStatus placedAt shippingAddress status totalPayable userId',
      })
      .populate({ path: 'userId', select: 'name email phone avatar' })
      .sort({ paidAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    Payment.countDocuments(filter).exec(),
  ]);

  return {
    items: payments.map(formatAdminPayment),
    pagination: {
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
      limit,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const listAdminPaymentAttempts = async (query = {}) => {
  assertDatabaseReady();
  const { limit, page, skip } = getPagination(query);
  const filter = {};
  const provider = normalizeAdminProvider(query.provider);
  const status = normalizeAdminAttemptStatus(query.status);
  const searchFilter = await buildAdminPaymentSearchFilter(query.search, [
    'failureReason',
    'providerOrderId',
    'providerPaymentId',
    'providerSessionId',
  ]);

  if (provider) {
    filter.provider = provider;
  }

  if (status) {
    filter.status = status;
  }

  if (query.orderId) {
    filter.orderId = normalizeObjectId(query.orderId, 'order id');
  }

  if (query.userId) {
    filter.userId = normalizeObjectId(query.userId, 'user id');
  }

  if (searchFilter) {
    Object.assign(filter, searchFilter);
  }

  const [attempts, total] = await Promise.all([
    PaymentAttempt.find(filter)
      .populate({
        path: 'orderId',
        populate: { path: 'userId', select: 'name email phone avatar' },
        select: 'currency orderNumber paidAt paymentStatus placedAt shippingAddress status totalPayable userId',
      })
      .populate({ path: 'userId', select: 'name email phone avatar' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    PaymentAttempt.countDocuments(filter).exec(),
  ]);

  return {
    items: attempts.map(formatAdminPaymentAttempt),
    pagination: {
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
      limit,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

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
  assertStorefrontCheckoutSupport(providerName);
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

    const fromStatus = order.status;
    const fromPaymentStatus = order.paymentStatus;
    order.paymentFailureReason = '';
    order.paymentMethod = PAYMENT_METHOD.UNKNOWN;
    order.paymentProvider = providerName;
    order.paymentStatus = PAYMENT_STATUS.PENDING;
    order.providerOrderId = paymentAttempt.providerOrderId;
    order.providerPaymentId = '';
    await order.save();

    if (fromStatus !== order.status || fromPaymentStatus !== order.paymentStatus) {
      await appendOrderStatusHistory({
        actorId: userId,
        fromPaymentStatus,
        fromStatus,
        note: `Payment attempt started via ${providerName}`,
        order,
      });
    }

    return {
      checkoutPayload: session.checkoutPayload || {},
      paymentAttempt: formatPaymentAttempt(paymentAttempt),
      provider: providerName,
    };
  } catch (error) {
    paymentAttempt.failureReason = error.message || 'Payment session creation failed';
    paymentAttempt.status = PAYMENT_ATTEMPT_STATUS.FAILED;
    await paymentAttempt.save();

    const fromStatus = order.status;
    const fromPaymentStatus = order.paymentStatus;

    if (order.paymentStatus !== PAYMENT_STATUS.PAID) {
      order.paymentFailureReason = paymentAttempt.failureReason;
      order.paymentMethod = PAYMENT_METHOD.UNKNOWN;
      order.paymentProvider = providerName;
      order.paymentStatus = PAYMENT_STATUS.FAILED;
      order.providerOrderId = paymentAttempt.providerOrderId || '';
      order.providerPaymentId = paymentAttempt.providerPaymentId || '';
      await order.save();

      if (fromStatus !== order.status || fromPaymentStatus !== order.paymentStatus) {
        await appendOrderStatusHistory({
          actorId: userId,
          fromPaymentStatus,
          fromStatus,
          note: `Payment session failed via ${providerName}`,
          order,
        });
      }
    }

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

  if (result.status === PAYMENT_ATTEMPT_STATUS.CANCELLED && order.paymentStatus !== PAYMENT_STATUS.PAID) {
    order.paymentFailureReason = paymentAttempt.failureReason || 'Payment was cancelled';
    order.paymentMethod = paymentAttempt.paymentMethod || PAYMENT_METHOD.UNKNOWN;
    order.paymentProvider = paymentAttempt.provider;
    order.paymentStatus = PAYMENT_STATUS.PENDING;
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

const recordPaymentAttemptFailure = async (actor, paymentAttemptId, payload = {}) => {
  assertDatabaseReady();
  const paymentAttempt = await getOwnedPaymentAttempt(actor, paymentAttemptId);
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

  await applyPaymentResultToOrder({
    actorId: paymentAttempt.userId,
    order,
    paymentAttempt,
    result: {
      failureReason: normalizeText(payload.failureReason)
        || (payload.status === PAYMENT_ATTEMPT_STATUS.CANCELLED ? 'Payment was cancelled' : 'Payment failed'),
      paymentMethod: normalizeOptionalPaymentMethod(payload.paymentMethod)
        || paymentAttempt.paymentMethod
        || PAYMENT_METHOD.UNKNOWN,
      providerOrderId: normalizeText(payload.providerOrderId) || paymentAttempt.providerOrderId || '',
      providerPaymentId: normalizeText(payload.providerPaymentId) || paymentAttempt.providerPaymentId || '',
      rawStatusResponse: payload.metadata || null,
      status: normalizeRecordedAttemptStatus(payload.status),
    },
  });

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
  assertStorefrontCheckoutSupport,
  createPaymentSession,
  getStatusData,
  handleProviderWebhook,
  listAdminPaymentAttempts,
  listAdminPayments,
  processWebhook,
  recordPaymentAttemptFailure,
  refreshPaymentAttemptStatus,
  verifyPaymentAttempt,
};

export default {
  assertStorefrontCheckoutSupport,
  createPaymentSession,
  getStatusData,
  handleProviderWebhook,
  listAdminPaymentAttempts,
  listAdminPayments,
  processWebhook,
  recordPaymentAttemptFailure,
  refreshPaymentAttemptStatus,
  verifyPaymentAttempt,
};
