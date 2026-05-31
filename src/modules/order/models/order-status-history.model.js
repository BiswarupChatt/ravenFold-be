import mongoose from 'mongoose';

import { ORDER_STATUS, PAYMENT_STATUS } from '@/common/constants/order.constant.js';

const orderStatusHistorySchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    fromStatus: {
      type: String,
      enum: [...Object.values(ORDER_STATUS), null],
      default: null,
    },
    toStatus: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      required: true,
    },
    fromPaymentStatus: {
      type: String,
      enum: [...Object.values(PAYMENT_STATUS), null],
      default: null,
    },
    toPaymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
  },
  {
    collection: 'order_status_history',
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
    versionKey: false,
  },
);

orderStatusHistorySchema.index({ orderId: 1, createdAt: -1 });

const OrderStatusHistory = mongoose.models.OrderStatusHistory ||
  mongoose.model('OrderStatusHistory', orderStatusHistorySchema);

export { orderStatusHistorySchema };

export default OrderStatusHistory;
