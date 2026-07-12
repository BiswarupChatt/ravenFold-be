import mongoose from 'mongoose';

import {
  PROMOTION_APPLICABLE_ON,
  PROMOTION_DISCOUNT_METHOD,
  PROMOTION_TYPE,
  promotionApplicableOnValues,
  promotionDiscountMethods,
  promotionTypes,
} from '@/modules/promotion/constants/promotion.constants.js';

const promotionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: promotionTypes,
      required: true,
      index: true,
    },
    applicableOn: {
      type: String,
      enum: promotionApplicableOnValues,
      default: PROMOTION_APPLICABLE_ON.ALL_PRODUCTS,
    },
    productIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
      ],
      default: [],
    },
    categoryIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Category',
        },
      ],
      default: [],
    },
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: undefined,
    },
    discountValue: {
      type: Number,
      min: 0,
      default: null,
    },
    discountMethod: {
      type: String,
      enum: promotionDiscountMethods,
      default: null,
    },
    maxDiscountAmount: {
      type: Number,
      min: 0,
      default: null,
    },
    minOrderAmount: {
      type: Number,
      min: 0,
      default: null,
    },
    buyQuantity: {
      type: Number,
      min: 0,
      default: null,
    },
    getQuantity: {
      type: Number,
      min: 0,
      default: null,
    },
    usageLimit: {
      type: Number,
      min: 0,
      default: null,
    },
    perUserLimit: {
      type: Number,
      min: 0,
      default: null,
    },
    usedCount: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    priority: {
      type: Number,
      default: 0,
      required: true,
      index: true,
    },
    isStackable: {
      type: Boolean,
      default: false,
    },
    isAutomatic: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    startDate: {
      type: Date,
      default: null,
      index: true,
    },
    endDate: {
      type: Date,
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    collection: 'promotions',
    timestamps: true,
    versionKey: false,
  },
);

promotionSchema.index({ type: 1, isActive: 1, priority: -1 });
promotionSchema.index({ isActive: 1, startDate: 1, endDate: 1, priority: -1 });
promotionSchema.index(
  { couponCode: 1 },
  {
    unique: true,
    partialFilterExpression: {
      couponCode: {
        $type: 'string',
      },
    },
  },
);

promotionSchema.pre('validate', function validatePromotion() {
  this.title = (this.title || '').trim();
  this.description = (this.description || '').trim();
  this.couponCode = this.couponCode ? String(this.couponCode).trim().toUpperCase() : undefined;
  this.discountValue = this.discountValue === null || this.discountValue === undefined
    ? null
    : Number(this.discountValue.toFixed(2));
  this.maxDiscountAmount = this.maxDiscountAmount === null || this.maxDiscountAmount === undefined
    ? null
    : Number(this.maxDiscountAmount.toFixed(2));
  this.minOrderAmount = this.minOrderAmount === null || this.minOrderAmount === undefined
    ? null
    : Number(this.minOrderAmount.toFixed(2));
  this.buyQuantity = this.buyQuantity === null || this.buyQuantity === undefined
    ? null
    : Number(this.buyQuantity);
  this.getQuantity = this.getQuantity === null || this.getQuantity === undefined
    ? null
    : Number(this.getQuantity);
  this.usageLimit = this.usageLimit === null || this.usageLimit === undefined
    ? null
    : Number(this.usageLimit);
  this.perUserLimit = this.perUserLimit === null || this.perUserLimit === undefined
    ? null
    : Number(this.perUserLimit);
  this.usedCount = Number(this.usedCount || 0);
  this.priority = Number(this.priority || 0);

  if (!Number.isInteger(this.usedCount) || this.usedCount < 0) {
    this.invalidate('usedCount', 'usedCount must be a non-negative integer');
  }

  if (!Number.isInteger(this.priority)) {
    this.invalidate('priority', 'priority must be an integer');
  }

  if (this.buyQuantity !== null && (!Number.isInteger(this.buyQuantity) || this.buyQuantity <= 0)) {
    this.invalidate('buyQuantity', 'buyQuantity must be a positive integer');
  }

  if (this.getQuantity !== null && (!Number.isInteger(this.getQuantity) || this.getQuantity <= 0)) {
    this.invalidate('getQuantity', 'getQuantity must be a positive integer');
  }

  if (this.usageLimit !== null && (!Number.isInteger(this.usageLimit) || this.usageLimit < 0)) {
    this.invalidate('usageLimit', 'usageLimit must be a non-negative integer');
  }

  if (this.perUserLimit !== null && (!Number.isInteger(this.perUserLimit) || this.perUserLimit < 0)) {
    this.invalidate('perUserLimit', 'perUserLimit must be a non-negative integer');
  }

  if (this.startDate && this.endDate && this.startDate > this.endDate) {
    this.invalidate('endDate', 'endDate must be greater than or equal to startDate');
  }

  if (this.perUserLimit !== null && this.usageLimit !== null && this.perUserLimit > this.usageLimit) {
    this.invalidate('perUserLimit', 'perUserLimit cannot be greater than usageLimit');
  }

  if (this.applicableOn === PROMOTION_APPLICABLE_ON.SPECIFIC_PRODUCTS && !this.productIds.length) {
    this.invalidate('productIds', 'productIds is required when applicableOn is SPECIFIC_PRODUCTS');
  }

  if (this.applicableOn === PROMOTION_APPLICABLE_ON.SPECIFIC_CATEGORIES && !this.categoryIds.length) {
    this.invalidate('categoryIds', 'categoryIds is required when applicableOn is SPECIFIC_CATEGORIES');
  }

  if (this.type === PROMOTION_TYPE.COUPON && !this.couponCode) {
    this.invalidate('couponCode', 'couponCode is required for coupon promotions');
  }

  if (this.type === PROMOTION_TYPE.PRODUCT_DISCOUNT && !this.productIds.length) {
    this.invalidate('productIds', 'productIds is required for product discount promotions');
  }

  if (this.type === PROMOTION_TYPE.CATEGORY_DISCOUNT && !this.categoryIds.length) {
    this.invalidate('categoryIds', 'categoryIds is required for category discount promotions');
  }

  if (
    [
      PROMOTION_TYPE.PERCENTAGE_DISCOUNT,
      PROMOTION_TYPE.CATEGORY_DISCOUNT,
      PROMOTION_TYPE.PRODUCT_DISCOUNT,
      PROMOTION_TYPE.FIRST_ORDER,
      PROMOTION_TYPE.NEW_USER,
    ].includes(this.type)
    && (this.discountValue === null || this.discountValue <= 0 || this.discountValue > 100)
  ) {
    this.invalidate('discountValue', 'discountValue must be between 0 and 100 for percentage-based promotions');
  }

  if (this.type === PROMOTION_TYPE.FIXED_DISCOUNT && (this.discountValue === null || this.discountValue <= 0)) {
    this.invalidate('discountValue', 'discountValue must be greater than 0 for fixed discount promotions');
  }

  if (
    [PROMOTION_TYPE.COUPON, PROMOTION_TYPE.CART_VALUE].includes(this.type)
    && !this.discountMethod
  ) {
    this.invalidate('discountMethod', 'discountMethod is required for this promotion type');
  }

  if (
    [PROMOTION_TYPE.COUPON, PROMOTION_TYPE.CART_VALUE].includes(this.type)
    && this.discountMethod === PROMOTION_DISCOUNT_METHOD.PERCENTAGE
    && (this.discountValue === null || this.discountValue <= 0 || this.discountValue > 100)
  ) {
    this.invalidate('discountValue', 'discountValue must be between 0 and 100 for percentage discounts');
  }

  if (
    [PROMOTION_TYPE.COUPON, PROMOTION_TYPE.CART_VALUE].includes(this.type)
    && this.discountMethod === PROMOTION_DISCOUNT_METHOD.FIXED
    && (this.discountValue === null || this.discountValue <= 0)
  ) {
    this.invalidate('discountValue', 'discountValue must be greater than 0 for fixed discounts');
  }

  if (this.type === PROMOTION_TYPE.BUY_X_GET_Y) {
    if (!this.buyQuantity) {
      this.invalidate('buyQuantity', 'buyQuantity is required for buy-x-get-y promotions');
    }

    if (!this.getQuantity) {
      this.invalidate('getQuantity', 'getQuantity is required for buy-x-get-y promotions');
    }
  }

  if (this.type === PROMOTION_TYPE.CART_VALUE && (this.minOrderAmount === null || this.minOrderAmount <= 0)) {
    this.invalidate('minOrderAmount', 'minOrderAmount must be greater than 0 for cart value promotions');
  }

  if (this.type === PROMOTION_TYPE.FREE_SHIPPING) {
    this.discountValue = null;
    this.discountMethod = null;
    this.maxDiscountAmount = null;
  }

  if (this.type === PROMOTION_TYPE.BUY_X_GET_Y) {
    this.discountValue = null;
    this.discountMethod = null;
    this.maxDiscountAmount = null;
  }
});

const Promotion = mongoose.models.Promotion || mongoose.model('Promotion', promotionSchema);

export { promotionSchema };

export default Promotion;
