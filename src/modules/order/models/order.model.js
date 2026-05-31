import mongoose from 'mongoose';

import { ORDER_STATUS, PAYMENT_STATUS } from '@/common/constants/order.constant.js';

const addressSnapshotSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    addressLine1: {
      type: String,
      required: true,
      trim: true,
    },
    addressLine2: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    addressType: {
      type: String,
      trim: true,
      default: 'home',
    },
  },
  {
    _id: false,
  },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    cartId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cart',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'INR',
    },
    itemCount: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    totalQuantity: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    totalMrp: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    subtotal: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    bagDiscount: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    couponDiscount: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    shippingCharge: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    totalPayable: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    billingSameAsShipping: {
      type: Boolean,
      default: true,
    },
    shippingAddress: {
      type: addressSnapshotSchema,
      required: true,
    },
    billingAddress: {
      type: addressSnapshotSchema,
      required: true,
    },
    placedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    collection: 'orders',
    timestamps: true,
    versionKey: false,
  },
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, paymentStatus: 1, createdAt: -1 });

orderSchema.pre('validate', function validateOrderTotals() {
  if (!Number.isInteger(this.itemCount)) {
    this.invalidate('itemCount', 'itemCount must be an integer');
  }

  if (!Number.isInteger(this.totalQuantity)) {
    this.invalidate('totalQuantity', 'totalQuantity must be an integer');
  }

  this.totalMrp = Number((this.totalMrp || 0).toFixed(2));
  this.subtotal = Number((this.subtotal || 0).toFixed(2));
  this.bagDiscount = Number((this.bagDiscount || 0).toFixed(2));
  this.couponDiscount = Number((this.couponDiscount || 0).toFixed(2));
  this.shippingCharge = Number((this.shippingCharge || 0).toFixed(2));
  this.totalPayable = Number((this.totalPayable || 0).toFixed(2));
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

export { addressSnapshotSchema, orderSchema };

export default Order;
