import mongoose from 'mongoose';

import {
  PAYMENT_PROVIDER,
  REFUND_STATUS,
} from '@/common/constants/payment.constant.js';

const refundSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    provider: {
      type: String,
      enum: Object.values(PAYMENT_PROVIDER),
      required: true,
      index: true,
    },
    providerPaymentId: {
      type: String,
      trim: true,
      required: true,
      index: true,
    },
    providerRefundId: {
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
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: Object.values(REFUND_STATUS),
      default: REFUND_STATUS.PENDING,
      index: true,
    },
    failureReason: {
      type: String,
      trim: true,
      default: '',
    },
    processedAt: {
      type: Date,
      default: null,
    },
    rawCreateResponse: {
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
    collection: 'refunds',
    timestamps: true,
    versionKey: false,
  },
);

refundSchema.index({ orderId: 1, createdAt: -1 });
refundSchema.index({ paymentId: 1, createdAt: -1 });
refundSchema.index({ provider: 1, providerRefundId: 1 });

refundSchema.pre('validate', function validateRefund() {
  this.amount = Number((this.amount || 0).toFixed(2));
  this.currency = (this.currency || 'INR').toUpperCase();
});

const Refund = mongoose.models.Refund || mongoose.model('Refund', refundSchema);

export { refundSchema };

export default Refund;
