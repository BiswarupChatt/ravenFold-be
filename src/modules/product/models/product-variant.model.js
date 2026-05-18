import mongoose from 'mongoose';

const weightUnits = ['g', 'kg', 'lb', 'oz'];
const dimensionUnits = ['cm', 'in'];

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

const shippingSchema = new mongoose.Schema(
  {
    requiresShipping: {
      type: Boolean,
      default: true,
    },
    weight: {
      value: {
        type: Number,
        min: 0,
        default: null,
      },
      unit: {
        type: String,
        enum: weightUnits,
        default: 'gram',
      },
    },
    dimensions: {
      length: {
        type: Number,
        min: 0,
        default: null,
      },
      width: {
        type: Number,
        min: 0,
        default: null,
      },
      height: {
        type: Number,
        min: 0,
        default: null,
      },
      unit: {
        type: String,
        enum: dimensionUnits,
        default: 'cm',
      },
    },
    shippingClass: {
      type: String,
      trim: true,
      default: '',
    },
    isFreeShippingEligible: {
      type: Boolean,
      default: false,
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
