import logger from '@/common/logger/logger.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '@/common/constants/order.constant.js';
import {
  assertDatabaseReady,
  getDocumentId,
  normalizeObjectId,
  normalizeText,
} from '@/common/utils/service.util.js';
import {
  frontendUrl,
  reviewReminderBatchSize,
  reviewReminderDelayDays,
  reviewReminderEmailMode,
  reviewReminderMaxAttempts,
} from '@/config/env.config.js';
import OrderItem from '@/modules/order/models/order-item.model.js';
import Order from '@/modules/order/models/order.model.js';
import ProductVariant from '@/modules/product/models/product-variant.model.js';
import Product from '@/modules/product/models/product.model.js';
import ReviewReminder from '@/modules/review/models/review-reminder.model.js';
import Review from '@/modules/review/models/review.model.js';
import { REVIEW_ELIGIBILITY_REASON, REVIEW_REMINDER_STATUS } from '@/modules/review/review.constants.js';
import User from '@/modules/users/models/user.model.js';

const buildReminderReviewUrl = ({ orderId, orderItemId }) => {
  const baseUrl = String(frontendUrl || '').replace(/\/$/, '');

  if (!baseUrl || baseUrl === '*') {
    return '';
  }

  return `${baseUrl}/profile/reviews?orderId=${orderId}&orderItemId=${orderItemId}`;
};

const scheduleReviewRemindersForDeliveredOrder = async (orderIdValue, deliveredAtValue = new Date()) => {
  assertDatabaseReady();
  const orderId = normalizeObjectId(orderIdValue, 'order id');
  const order = await Order.findById(orderId).lean().exec();

  if (!order) {
    return 0;
  }

  const orderItems = await OrderItem.find({ orderId: order._id }).lean().exec();

  if (!orderItems.length) {
    return 0;
  }

  const deliveredAt = new Date(deliveredAtValue || order.updatedAt || new Date());
  const scheduledFor = new Date(deliveredAt.getTime() + (reviewReminderDelayDays * 24 * 60 * 60 * 1000));
  let scheduledCount = 0;

  for (const orderItem of orderItems) {
    const existingReview = await Review.findOne({
      deletedAt: null,
      orderItemId: orderItem._id,
      userId: order.userId,
    })
      .select('_id')
      .lean()
      .exec();

    if (existingReview) {
      continue;
    }

    const updateResult = await ReviewReminder.updateOne(
      { orderItemId: orderItem._id },
      {
        $setOnInsert: {
          attemptCount: 0,
          deliveredAt,
          orderId: order._id,
          productId: orderItem.productId,
          scheduledFor,
          status: REVIEW_REMINDER_STATUS.PENDING,
          userId: order.userId,
          variantId: orderItem.variantId || null,
        },
      },
      { upsert: true },
    ).exec();

    if (updateResult.upsertedCount > 0) {
      scheduledCount += 1;
    }
  }

  return scheduledCount;
};

const markReminderSkipped = async (reminder, reason) => {
  reminder.status = REVIEW_REMINDER_STATUS.SKIPPED;
  reminder.skipReason = normalizeText(reason);
  reminder.failureReason = '';
  reminder.failedAt = null;
  await reminder.save();
  return reminder;
};

const markReminderFailed = async (reminder, error) => {
  reminder.status = REVIEW_REMINDER_STATUS.FAILED;
  reminder.failedAt = new Date();
  reminder.failureReason = normalizeText(error?.message || error || 'Reminder processing failed');
  await reminder.save();
  return reminder;
};

const markReminderSent = async (reminder) => {
  reminder.status = REVIEW_REMINDER_STATUS.SENT;
  reminder.sentAt = new Date();
  reminder.failedAt = null;
  reminder.failureReason = '';
  reminder.skipReason = '';
  await reminder.save();
  return reminder;
};

const sendReminderEmail = async ({ order, orderItem, product, user, variant }) => {
  const reviewUrl = buildReminderReviewUrl({
    orderId: getDocumentId(order._id),
    orderItemId: getDocumentId(orderItem._id),
  });
  const payload = {
    customerName: user.name || 'Customer',
    orderId: getDocumentId(order._id),
    orderNumber: order.orderNumber || '',
    productName: orderItem.productSnapshot?.name || product.name || 'Product',
    recipientEmail: user.email || '',
    reviewUrl,
    subject: 'How was your recent purchase?',
    variantDetails: orderItem.productSnapshot?.variantLabel || variant?.optionValues?.map((entry) => `${entry.optionName}: ${entry.value}`).join(', ') || '',
  };

  if (reviewReminderEmailMode !== 'log') {
    throw new Error('Review reminder email provider is not configured');
  }

  logger.info('Review reminder email payload generated', payload);
  return payload;
};

const processReminder = async (reminder) => {
  const [user, order, orderItem, product, variant, existingReview] = await Promise.all([
    User.findById(reminder.userId).lean().exec(),
    Order.findById(reminder.orderId).lean().exec(),
    OrderItem.findById(reminder.orderItemId).lean().exec(),
    Product.findById(reminder.productId).lean().exec(),
    reminder.variantId ? ProductVariant.findById(reminder.variantId).lean().exec() : Promise.resolve(null),
    Review.findOne({
      deletedAt: null,
      orderItemId: reminder.orderItemId,
      userId: reminder.userId,
    })
      .select('_id')
      .lean()
      .exec(),
  ]);

  if (existingReview) {
    return markReminderSkipped(reminder, REVIEW_ELIGIBILITY_REASON.REVIEW_ALREADY_EXISTS);
  }

  if (!user) {
    return markReminderSkipped(reminder, REVIEW_ELIGIBILITY_REASON.CUSTOMER_NOT_FOUND);
  }

  if (!user.email) {
    return markReminderSkipped(reminder, REVIEW_ELIGIBILITY_REASON.CUSTOMER_EMAIL_UNAVAILABLE);
  }

  if (!order) {
    return markReminderSkipped(reminder, REVIEW_ELIGIBILITY_REASON.ORDER_NOT_DELIVERED);
  }

  if ([ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED].includes(order.status)) {
    return markReminderSkipped(reminder, REVIEW_ELIGIBILITY_REASON.ITEM_CANCELLED);
  }

  if ([PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.PARTIALLY_REFUNDED].includes(order.paymentStatus)) {
    return markReminderSkipped(reminder, REVIEW_ELIGIBILITY_REASON.ITEM_REFUNDED);
  }

  if (order.status !== ORDER_STATUS.DELIVERED) {
    return markReminderSkipped(reminder, REVIEW_ELIGIBILITY_REASON.ORDER_NOT_DELIVERED);
  }

  if (!orderItem) {
    return markReminderSkipped(reminder, REVIEW_ELIGIBILITY_REASON.ORDER_ITEM_NOT_FOUND);
  }

  if (!product) {
    return markReminderSkipped(reminder, REVIEW_ELIGIBILITY_REASON.PRODUCT_DELETED);
  }

  await sendReminderEmail({
    order,
    orderItem,
    product,
    user,
    variant,
  });

  return markReminderSent(reminder);
};

const claimNextDueReminder = async () => {
  const now = new Date();

  return ReviewReminder.findOneAndUpdate(
    {
      attemptCount: { $lt: reviewReminderMaxAttempts },
      scheduledFor: { $lte: now },
      status: { $in: [REVIEW_REMINDER_STATUS.PENDING, REVIEW_REMINDER_STATUS.FAILED] },
    },
    {
      $inc: { attemptCount: 1 },
      $set: {
        lastAttemptAt: now,
        status: REVIEW_REMINDER_STATUS.PROCESSING,
      },
    },
    {
      new: true,
      sort: { scheduledFor: 1, createdAt: 1 },
    },
  ).exec();
};

const processDueReviewReminders = async () => {
  assertDatabaseReady();
  const processedReminderIds = [];

  for (let index = 0; index < reviewReminderBatchSize; index += 1) {
    const reminder = await claimNextDueReminder();

    if (!reminder) {
      break;
    }

    try {
      await processReminder(reminder);
      processedReminderIds.push(reminder._id.toString());
    } catch (error) {
      await markReminderFailed(reminder, error);
      processedReminderIds.push(reminder._id.toString());
    }
  }

  return processedReminderIds;
};

export {
  buildReminderReviewUrl,
  processDueReviewReminders,
  scheduleReviewRemindersForDeliveredOrder,
};

export default {
  buildReminderReviewUrl,
  processDueReviewReminders,
  scheduleReviewRemindersForDeliveredOrder,
};
