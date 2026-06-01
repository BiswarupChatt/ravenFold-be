import mongoose from 'mongoose';

import {
  PAYMENT_ATTEMPT_STATUS,
  PAYMENT_METHOD,
  PAYMENT_PROVIDER,
} from '@/common/constants/payment.constant.js';

const paymentAttemptSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: Object.values(PAYMENT_PROVIDER),
      required: true,
      index: true,
    },
    providerOrderId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    providerPaymentId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    providerSessionId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    amount: {
      type: Number,
      min: 0,
      required: true,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'INR',
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_ATTEMPT_STATUS),
      default: PAYMENT_ATTEMPT_STATUS.CREATED,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      default: PAYMENT_METHOD.UNKNOWN,
    },
    failureReason: {
      type: String,
      trim: true,
      default: '',
    },
    idempotencyKey: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    rawCreateResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    rawVerifyResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    rawStatusResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    collection: 'payment_attempts',
    timestamps: true,
    versionKey: false,
  },
);

paymentAttemptSchema.index({ orderId: 1, createdAt: -1 });
paymentAttemptSchema.index({ provider: 1, providerOrderId: 1 });
paymentAttemptSchema.index({ provider: 1, providerPaymentId: 1 });

paymentAttemptSchema.pre('validate', function validatePaymentAttempt() {
  this.amount = Number((this.amount || 0).toFixed(2));
  this.currency = (this.currency || 'INR').toUpperCase();
});

const PaymentAttempt = mongoose.models.PaymentAttempt || mongoose.model('PaymentAttempt', paymentAttemptSchema);

export { paymentAttemptSchema };

export default PaymentAttempt;
