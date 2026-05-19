import mongoose from 'mongoose';

import { dimensionUnits, shippingSchema, weightUnits } from '@/modules/product/models/product.model.js';

const variantOptionValueSchema = new mongoose.Schema(
  {
    optionName: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const productVariantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    optionValues: {
      type: [variantOptionValueSchema],
      default: [],
    },
    optionSignature: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    salePrice: {
      type: Number,
      min: 0,
      default: null,
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
    shipping: {
      type: shippingSchema,
      default: () => ({}),
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    collection: 'product_variants',
    timestamps: true,
    versionKey: false,
  },
);

productVariantSchema.index({ productId: 1, optionSignature: 1 }, { unique: true });
productVariantSchema.index({ productId: 1, isActive: 1 });

productVariantSchema.pre('validate', function validateVariantPricing() {
  if (this.salePrice !== null && this.salePrice !== undefined && this.salePrice > this.price) {
    this.invalidate('salePrice', 'salePrice cannot be greater than price');
  }
});

const ProductVariant = mongoose.models.ProductVariant || mongoose.model('ProductVariant', productVariantSchema);

export { dimensionUnits, productVariantSchema, weightUnits };

export default ProductVariant;
