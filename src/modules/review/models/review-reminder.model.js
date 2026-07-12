import mongoose from 'mongoose';

import { REVIEW_REMINDER_STATUS } from '@/modules/review/review.constants.js';

const reviewReminderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    orderItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrderItem',
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductVariant',
      default: null,
    },
    deliveredAt: {
      type: Date,
      required: true,
    },
    scheduledFor: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(REVIEW_REMINDER_STATUS),
      default: REVIEW_REMINDER_STATUS.PENDING,
      index: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      trim: true,
      default: '',
    },
    skipReason: {
      type: String,
      trim: true,
      default: '',
    },
    attemptCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'review_reminders',
    timestamps: true,
    versionKey: false,
  },
);

reviewReminderSchema.index({ orderItemId: 1 }, { unique: true });
reviewReminderSchema.index({ status: 1, scheduledFor: 1, attemptCount: 1 });

const ReviewReminder = mongoose.models.ReviewReminder || mongoose.model('ReviewReminder', reviewReminderSchema);

export { reviewReminderSchema };

export default ReviewReminder;
