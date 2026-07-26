import mongoose from 'mongoose';

import { ORDER_STATUS, PAYMENT_STATUS } from '@/common/constants/order.constant.js';
import { PAYMENT_METHOD, PAYMENT_PROVIDER } from '@/common/constants/payment.constant.js';
import {
  INVOICE_STATUS,
  INVOICE_TYPES,
  SUPPLY_TYPES,
} from '@/modules/gst/gst.constants.js';

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
    stateCode: {
      type: String,
      trim: true,
      default: '',
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

const appliedPromotionSnapshotSchema = new mongoose.Schema(
  {
    promotionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Promotion',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    shippingDiscountAmount: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const customerGstDetailsSchema = new mongoose.Schema(
  {
    businessName: { type: String, trim: true, default: '' },
    contactNumber: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    gstin: { type: String, trim: true, uppercase: true, default: '' },
    tradeName: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const sellerGstSnapshotSchema = new mongoose.Schema(
  {
    authorisedSignatory: { type: Object, default: () => ({}) },
    bankDetails: { type: Object, default: () => ({}) },
    brandName: { type: String, trim: true, default: '' },
    businessLegalName: { type: String, trim: true, default: '' },
    businessLogoUrl: { type: String, trim: true, default: '' },
    contactNumber: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    gstin: { type: String, trim: true, uppercase: true, default: '' },
    invoiceNotes: { type: String, trim: true, default: '' },
    invoiceTerms: { type: String, trim: true, default: '' },
    pan: { type: String, trim: true, uppercase: true, default: '' },
    registeredAddress: { type: Object, default: () => ({}) },
    tradeName: { type: String, trim: true, default: '' },
  },
  { _id: false },
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
    paymentProvider: {
      type: String,
      enum: [...Object.values(PAYMENT_PROVIDER), ''],
      trim: true,
      default: '',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      default: PAYMENT_METHOD.UNKNOWN,
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
    paymentFailureReason: {
      type: String,
      trim: true,
      default: '',
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
    productDiscountAmount: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    shippingDiscountAmount: {
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
    invoiceType: {
      type: String,
      enum: Object.values(INVOICE_TYPES),
      default: INVOICE_TYPES.B2C,
      index: true,
    },
    customerGstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
      index: true,
    },
    customerBusinessName: {
      type: String,
      trim: true,
      default: '',
    },
    customerGstDetails: {
      type: customerGstDetailsSchema,
      default: () => ({}),
    },
    placeOfSupply: {
      type: String,
      trim: true,
      default: '',
    },
    placeOfSupplyStateCode: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    supplyType: {
      type: String,
      enum: [...Object.values(SUPPLY_TYPES), ''],
      default: '',
      index: true,
    },
    sellerGstSnapshot: {
      type: sellerGstSnapshotSchema,
      default: () => ({}),
    },
    shippingTaxSummary: {
      type: Object,
      default: () => ({}),
    },
    taxTotals: {
      type: Object,
      default: () => ({
        discountTotal: 0,
        grandTotal: 0,
        roundOffAmount: 0,
        totalCess: 0,
        totalCgst: 0,
        totalGst: 0,
        totalIgst: 0,
        totalSgst: 0,
        totalTaxableValue: 0,
      }),
    },
    invoiceNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
      index: true,
    },
    invoiceDate: {
      type: Date,
      default: null,
    },
    invoiceFinancialYear: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    invoicePdfPath: {
      type: String,
      trim: true,
      default: '',
    },
    invoiceGenerationStatus: {
      type: String,
      enum: Object.values(INVOICE_STATUS),
      default: INVOICE_STATUS.PENDING,
    },
    invoiceAdjustmentStatus: {
      type: String,
      trim: true,
      default: '',
    },
    appliedPromotions: {
      type: [appliedPromotionSnapshotSchema],
      default: [],
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
  this.productDiscountAmount = Number((this.productDiscountAmount || 0).toFixed(2));
  this.shippingDiscountAmount = Number((this.shippingDiscountAmount || 0).toFixed(2));
  this.shippingCharge = Number((this.shippingCharge || 0).toFixed(2));
  this.totalPayable = Number((this.totalPayable || 0).toFixed(2));
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

export {
  addressSnapshotSchema,
  appliedPromotionSnapshotSchema,
  customerGstDetailsSchema,
  orderSchema,
  sellerGstSnapshotSchema,
};

export default Order;
