import ApiError from '@/common/errors/api.error.js';
import { PAYMENT_STATUS } from '@/common/constants/order.constant.js';
import {
  PAYMENT_RECORD_STATUS,
  PAYMENT_PROVIDER,
  REFUND_STATUS,
} from '@/common/constants/payment.constant.js';
import { getPagination } from '@/common/utils/pagination.util.js';
import {
  assertDatabaseReady,
  getDocumentId,
  normalizeMoney,
  normalizeObjectId,
  normalizeOptionalObjectId,
  normalizeText,
} from '@/common/utils/service.util.js';
import Order from '@/modules/order/models/order.model.js';
import OrderStatusHistory from '@/modules/order/models/order-status-history.model.js';
import Payment from '@/modules/payment/models/payment.model.js';
import Refund from '@/modules/payment/models/refund.model.js';
import { getPaymentProvider } from '@/modules/payment/providers/payment-provider.registry.js';

const normalizeActorId = (actor = null) => {
  if (!actor?.id) {
    return null;
  }

  return normalizeObjectId(actor.id, 'authenticated user');
};

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

const formatPaymentSummary = (payment) => {
  if (!payment || typeof payment !== 'object' || !payment._id) {
    return null;
  }

  return {
    amount: payment.amount,
    currency: payment.currency,
    id: payment._id.toString(),
    providerPaymentId: payment.providerPaymentId || '',
    refundedAmount: payment.refundedAmount || 0,
    status: payment.status || '',
  };
};

const formatRefund = (refund) => ({
  amount: refund.amount,
  createdAt: refund.createdAt,
  currency: refund.currency,
  failureReason: refund.failureReason || '',
  id: refund.id || refund._id?.toString(),
  order: formatOrderSummary(refund.orderId),
  orderId: getDocumentId(refund.orderId),
  payment: formatPaymentSummary(refund.paymentId),
  paymentId: getDocumentId(refund.paymentId),
  processedAt: refund.processedAt,
  provider: refund.provider,
  providerPaymentId: refund.providerPaymentId || '',
  providerRefundId: refund.providerRefundId || '',
  reason: refund.reason || '',
  requestedBy: getDocumentId(refund.requestedBy),
  requestedByUser: formatUserSummary(refund.requestedBy),
  status: refund.status,
  updatedAt: refund.updatedAt,
  user: formatUserSummary(refund.userId),
  userId: getDocumentId(refund.userId),
});

const formatPayment = (payment) => ({
  amount: payment.amount,
  createdAt: payment.createdAt,
  currency: payment.currency,
  id: payment.id || payment._id?.toString(),
  orderId: getDocumentId(payment.orderId),
  paidAt: payment.paidAt,
  paymentAttemptId: getDocumentId(payment.paymentAttemptId),
  paymentMethod: payment.paymentMethod || '',
  provider: payment.provider,
  providerOrderId: payment.providerOrderId || '',
  providerPaymentId: payment.providerPaymentId || '',
  refundableAmount: Number(Math.max(Number(payment.amount || 0) - Number(payment.refundedAmount || 0), 0).toFixed(2)),
  refundedAmount: payment.refundedAmount || 0,
  status: payment.status,
  updatedAt: payment.updatedAt,
  userId: getDocumentId(payment.userId),
});

const resolveRefundStatus = (value = '') => {
  const status = normalizeText(value).toLowerCase();

  if (!status || status === 'all') {
    return '';
  }

  if (!Object.values(REFUND_STATUS).includes(status)) {
    throw new ApiError(400, `status must be one of: ${Object.values(REFUND_STATUS).join(', ')}`);
  }

  return status;
};

const resolveRefundProvider = (value = '') => {
  const provider = normalizeText(value).toLowerCase();

  if (!provider || provider === 'all') {
    return '';
  }

  if (!Object.values(PAYMENT_PROVIDER).includes(provider)) {
    throw new ApiError(400, `provider must be one of: ${Object.values(PAYMENT_PROVIDER).join(', ')}`);
  }

  return provider;
};

const buildRefundSearchFilter = (value = '') => {
  const search = normalizeText(value);

  if (!search) {
    return null;
  }

  const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  return {
    $or: [
      { failureReason: searchRegex },
      { providerPaymentId: searchRegex },
      { providerRefundId: searchRegex },
      { reason: searchRegex },
    ],
  };
};

const getPaymentRecordStatus = (payment) => {
  const amount = Number(payment.amount || 0);
  const refundedAmount = Number(payment.refundedAmount || 0);

  if (amount > 0 && refundedAmount >= amount) {
    return PAYMENT_RECORD_STATUS.REFUNDED;
  }

  if (refundedAmount > 0) {
    return PAYMENT_RECORD_STATUS.PARTIALLY_REFUNDED;
  }

  return PAYMENT_RECORD_STATUS.PAID;
};

const getOrderPaymentStatus = (payment) => {
  const paymentStatus = getPaymentRecordStatus(payment);

  if (paymentStatus === PAYMENT_RECORD_STATUS.REFUNDED) {
    return PAYMENT_STATUS.REFUNDED;
  }

  if (paymentStatus === PAYMENT_RECORD_STATUS.PARTIALLY_REFUNDED) {
    return PAYMENT_STATUS.PARTIALLY_REFUNDED;
  }

  return PAYMENT_STATUS.PAID;
};

const updatePaymentAndOrderRefundState = async ({ actorId = null, order, payment }) => {
  const fromPaymentStatus = order.paymentStatus;
  const nextPaymentStatus = getOrderPaymentStatus(payment);

  payment.status = getPaymentRecordStatus(payment);
  await payment.save();

  if (order.paymentStatus !== nextPaymentStatus) {
    order.paymentStatus = nextPaymentStatus;
    await order.save();

    await OrderStatusHistory.create({
      createdBy: actorId,
      fromPaymentStatus,
      fromStatus: order.status,
      note: `Payment refund updated: ${payment.status}`,
      orderId: order._id,
      toPaymentStatus: order.paymentStatus,
      toStatus: order.status,
    });
  }
};

const getRefundablePayment = async (payload = {}) => {
  const paymentId = normalizeOptionalObjectId(payload.paymentId, 'payment id');
  const orderId = normalizeOptionalObjectId(payload.orderId, 'order id');

  if (!paymentId && !orderId) {
    throw new ApiError(400, 'paymentId or orderId is required');
  }

  const payment = paymentId
    ? await Payment.findById(paymentId).exec()
    : await Payment.findOne({ orderId }).sort({ paidAt: -1, createdAt: -1 }).exec();

  if (!payment) {
    throw new ApiError(404, 'Payment not found');
  }

  const [pendingRefundSummary] = await Refund.aggregate([
    {
      $match: {
        paymentId: payment._id,
        status: REFUND_STATUS.PENDING,
      },
    },
    {
      $group: {
        _id: null,
        amount: { $sum: '$amount' },
      },
    },
  ]).exec();
  const pendingRefundAmount = Number(pendingRefundSummary?.amount || 0);
  const refundableAmount = Number(Math.max(
    Number(payment.amount || 0) - Number(payment.refundedAmount || 0) - pendingRefundAmount,
    0,
  ).toFixed(2));

  if (refundableAmount <= 0) {
    throw new ApiError(409, 'Payment is already fully refunded');
  }

  return {
    payment,
    refundableAmount,
  };
};

const createAdminRefund = async (actor, payload = {}) => {
  assertDatabaseReady();
  const actorId = normalizeActorId(actor);
  const { payment, refundableAmount } = await getRefundablePayment(payload);
  const order = await Order.findById(payment.orderId).exec();

  if (!order) {
    throw new ApiError(404, 'Order not found for this payment');
  }

  const requestedAmount = normalizeMoney(payload.amount, 'amount');
  const amount = requestedAmount === null ? refundableAmount : requestedAmount;

  if (amount <= 0) {
    throw new ApiError(400, 'Refund amount must be greater than zero');
  }

  if (amount > refundableAmount) {
    throw new ApiError(400, `Refund amount cannot exceed ${refundableAmount}`);
  }

  const reason = normalizeText(payload.reason);
  const refund = await Refund.create({
    amount,
    currency: payment.currency,
    orderId: payment.orderId,
    paymentId: payment._id,
    provider: payment.provider,
    providerPaymentId: payment.providerPaymentId,
    reason,
    requestedBy: actorId,
    status: REFUND_STATUS.PENDING,
    userId: payment.userId,
  });

  try {
    const provider = getPaymentProvider(payment.provider);

    if (!provider.createRefund) {
      throw new ApiError(501, `${payment.provider} refunds are not supported`);
    }

    const result = await provider.createRefund({
      amount,
      payment,
      reason,
      refund,
    });

    refund.failureReason = result.failureReason || '';
    refund.providerRefundId = result.providerRefundId || '';
    refund.rawCreateResponse = result.rawCreateResponse || null;
    refund.status = result.status || REFUND_STATUS.PENDING;

    if (refund.status === REFUND_STATUS.PROCESSED) {
      refund.processedAt = new Date();
      payment.refundedAmount = Number((Number(payment.refundedAmount || 0) + amount).toFixed(2));
      await updatePaymentAndOrderRefundState({ actorId, order, payment });
    }

    await refund.save();

    return {
      payment: formatPayment(payment),
      refund: formatRefund(refund),
    };
  } catch (error) {
    refund.failureReason = error.message || 'Refund failed';
    refund.status = REFUND_STATUS.FAILED;
    await refund.save();
    throw error;
  }
};

const listAdminRefunds = async (query = {}) => {
  assertDatabaseReady();
  const { limit, page, skip } = getPagination(query);
  const provider = resolveRefundProvider(query.provider);
  const status = resolveRefundStatus(query.status);
  const searchFilter = buildRefundSearchFilter(query.search);
  const filter = {};

  if (provider) {
    filter.provider = provider;
  }

  if (status) {
    filter.status = status;
  }

  if (query.orderId) {
    filter.orderId = normalizeObjectId(query.orderId, 'order id');
  }

  if (query.paymentId) {
    filter.paymentId = normalizeObjectId(query.paymentId, 'payment id');
  }

  if (searchFilter) {
    Object.assign(filter, searchFilter);
  }

  const [refunds, total] = await Promise.all([
    Refund.find(filter)
      .populate({
        path: 'orderId',
        populate: { path: 'userId', select: 'name email phone avatar' },
        select: 'currency orderNumber paidAt paymentStatus placedAt shippingAddress status totalPayable userId',
      })
      .populate({ path: 'paymentId', select: 'amount currency providerPaymentId refundedAmount status' })
      .populate({ path: 'requestedBy', select: 'name email phone avatar' })
      .populate({ path: 'userId', select: 'name email phone avatar' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    Refund.countDocuments(filter).exec(),
  ]);

  return {
    items: refunds.map(formatRefund),
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

export {
  createAdminRefund,
  formatPayment,
  formatRefund,
  listAdminRefunds,
};

export default {
  createAdminRefund,
  formatPayment,
  formatRefund,
  listAdminRefunds,
};
