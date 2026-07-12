import mongoose from 'mongoose';

import { REVIEW_LIMITS, REVIEW_STATUS } from '@/modules/review/review.constants.js';

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductVariant',
      default: null,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    orderItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrderItem',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      min: REVIEW_LIMITS.MIN_RATING,
      max: REVIEW_LIMITS.MAX_RATING,
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: REVIEW_LIMITS.MAX_TITLE_LENGTH,
      default: '',
    },
    comment: {
      type: String,
      trim: true,
      required: true,
      maxlength: REVIEW_LIMITS.MAX_COMMENT_LENGTH,
    },
    images: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(REVIEW_STATUS),
      default: REVIEW_STATUS.PENDING,
      index: true,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true,
    },
    adminNote: {
      type: String,
      trim: true,
      default: '',
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    moderatedAt: {
      type: Date,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    hiddenAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    collection: 'reviews',
    timestamps: true,
    versionKey: false,
  },
);

reviewSchema.index(
  { userId: 1, orderItemId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deletedAt: null,
    },
  },
);
reviewSchema.index({ productId: 1, status: 1, deletedAt: 1, createdAt: -1 });
reviewSchema.index({ orderId: 1, deletedAt: 1 });
reviewSchema.index({ orderItemId: 1, deletedAt: 1 });
reviewSchema.index({ status: 1, createdAt: -1 });

reviewSchema.pre('validate', function validateReview() {
  if (!Number.isInteger(this.rating) || this.rating < REVIEW_LIMITS.MIN_RATING || this.rating > REVIEW_LIMITS.MAX_RATING) {
    this.invalidate('rating', `rating must be between ${REVIEW_LIMITS.MIN_RATING} and ${REVIEW_LIMITS.MAX_RATING}`);
  }

  const trimmedComment = String(this.comment || '').trim();

  if (trimmedComment.length < REVIEW_LIMITS.MIN_COMMENT_LENGTH) {
    this.invalidate('comment', `comment must be at least ${REVIEW_LIMITS.MIN_COMMENT_LENGTH} characters`);
  }

  this.comment = trimmedComment;
  this.title = String(this.title || '').trim();
  this.images = Array.isArray(this.images) ? this.images.filter(Boolean).slice(0, REVIEW_LIMITS.MAX_IMAGES) : [];
});

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

export { reviewSchema };

export default Review;
