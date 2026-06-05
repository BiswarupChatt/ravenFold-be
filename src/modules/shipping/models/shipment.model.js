import mongoose from 'mongoose';

import { SHIPMENT_STATUS, SHIPPING_PROVIDER } from '@/common/constants/shipping.constant.js';

const packageSchema = new mongoose.Schema(
  {
    breadth: {
      type: Number,
      min: 0,
      default: null,
    },
    height: {
      type: Number,
      min: 0,
      default: null,
    },
    length: {
      type: Number,
      min: 0,
      default: null,
    },
    weight: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const pickupAddressSchema = new mongoose.Schema(
  {
    addressLine1: {
      type: String,
      trim: true,
      default: '',
    },
    addressLine2: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    country: {
      type: String,
      trim: true,
      default: 'India',
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    pincode: {
      type: String,
      trim: true,
      default: '',
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    _id: false,
  },
);

const shipmentSchema = new mongoose.Schema(
  {
    awbCode: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    courierName: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    invoiceUrl: {
      type: String,
      trim: true,
      default: '',
    },
    labelUrl: {
      type: String,
      trim: true,
      default: '',
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    package: {
      type: packageSchema,
      default: () => ({}),
    },
    pickupAddress: {
      type: pickupAddressSchema,
      default: () => ({}),
    },
    pickupLocation: {
      type: String,
      trim: true,
      default: '',
    },
    pickupScheduledAt: {
      type: Date,
      default: null,
    },
    provider: {
      type: String,
      enum: Object.values(SHIPPING_PROVIDER),
      default: SHIPPING_PROVIDER.MANUAL,
      index: true,
    },
    providerOrderId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    providerShipmentId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    providerStatus: {
      type: String,
      trim: true,
      default: '',
    },
    rawProviderResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    shippedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(SHIPMENT_STATUS),
      default: SHIPMENT_STATUS.NOT_CREATED,
      index: true,
    },
    trackingUrl: {
      type: String,
      trim: true,
      default: '',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    collection: 'shipments',
    timestamps: true,
    versionKey: false,
  },
);

shipmentSchema.index({ orderId: 1, createdAt: -1 });
shipmentSchema.index({ status: 1, provider: 1, createdAt: -1 });

const Shipment = mongoose.models.Shipment || mongoose.model('Shipment', shipmentSchema);

export { packageSchema, pickupAddressSchema, shipmentSchema };

export default Shipment;
