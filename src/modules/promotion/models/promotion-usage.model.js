import mongoose from 'mongoose';

const promotionUsageSchema = new mongoose.Schema(
  {
    promotionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Promotion',
      required: true,
      index: true,
    },
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
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: undefined,
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
    usedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: 'promotion_usages',
    timestamps: true,
    versionKey: false,
  },
);

promotionUsageSchema.index({ promotionId: 1, userId: 1 });
promotionUsageSchema.index({ promotionId: 1, orderId: 1 }, { unique: true });
promotionUsageSchema.index({ couponCode: 1 });

promotionUsageSchema.pre('validate', function validatePromotionUsage() {
  this.couponCode = this.couponCode ? String(this.couponCode).trim().toUpperCase() : undefined;
  this.discountAmount = Number((this.discountAmount || 0).toFixed(2));
  this.shippingDiscountAmount = Number((this.shippingDiscountAmount || 0).toFixed(2));
});

const PromotionUsage = mongoose.models.PromotionUsage || mongoose.model('PromotionUsage', promotionUsageSchema);

export { promotionUsageSchema };

export default PromotionUsage;
