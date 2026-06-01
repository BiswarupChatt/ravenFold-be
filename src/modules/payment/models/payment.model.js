import mongoose from 'mongoose';

import {
  PAYMENT_METHOD,
  PAYMENT_PROVIDER,
  PAYMENT_RECORD_STATUS,
} from '@/common/constants/payment.constant.js';

const paymentSchema = new mongoose.Schema(
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
    paymentAttemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentAttempt',
      required: true,
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
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      min: 0,
      required: true,
    },
    refundedAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'INR',
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_RECORD_STATUS),
      default: PAYMENT_RECORD_STATUS.PAID,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      default: PAYMENT_METHOD.UNKNOWN,
    },
    paidAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    rawProviderResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    collection: 'payments',
    timestamps: true,
    versionKey: false,
  },
);

paymentSchema.index({ orderId: 1, createdAt: -1 });
paymentSchema.index({ paymentAttemptId: 1 }, { unique: true });
paymentSchema.index({ provider: 1, providerPaymentId: 1 }, { unique: true });

paymentSchema.pre('validate', function validatePayment() {
  this.amount = Number((this.amount || 0).toFixed(2));
  this.refundedAmount = Number((this.refundedAmount || 0).toFixed(2));
  this.currency = (this.currency || 'INR').toUpperCase();

  if (this.refundedAmount > this.amount) {
    this.invalidate('refundedAmount', 'refundedAmount cannot exceed amount');
  }
});

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

export { paymentSchema };

export default Payment;
