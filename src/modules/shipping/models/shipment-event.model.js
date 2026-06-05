import mongoose from 'mongoose';

import { SHIPMENT_STATUS, SHIPPING_PROVIDER } from '@/common/constants/shipping.constant.js';

const shipmentEventSchema = new mongoose.Schema(
  {
    eventAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    message: {
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
    provider: {
      type: String,
      enum: Object.values(SHIPPING_PROVIDER),
      default: SHIPPING_PROVIDER.MANUAL,
      index: true,
    },
    providerEventId: {
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
    rawEvent: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shipment',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(SHIPMENT_STATUS),
      required: true,
      index: true,
    },
  },
  {
    collection: 'shipment_events',
    timestamps: true,
    versionKey: false,
  },
);

shipmentEventSchema.index({ shipmentId: 1, eventAt: -1 });
shipmentEventSchema.index({ orderId: 1, eventAt: -1 });

const ShipmentEvent = mongoose.models.ShipmentEvent ||
  mongoose.model('ShipmentEvent', shipmentEventSchema);

export { shipmentEventSchema };

export default ShipmentEvent;
