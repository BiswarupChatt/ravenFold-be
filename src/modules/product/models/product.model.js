import mongoose from 'mongoose';

const productStatuses = ['draft', 'active', 'inactive'];

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    shortDescription: {
      type: String,
      trim: true,
      default: '',
    },
    metaTitle: {
      type: String,
      trim: true,
      default: '',
    },
    metaDescription: {
      type: String,
      trim: true,
      default: '',
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    salePrice: {
      type: Number,
      min: 0,
      default: null,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    hasVariants: {
      type: Boolean,
      default: false,
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
      enum: productStatuses,
      default: 'draft',
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    tags: {
      type: [
        {
          type: String,
          lowercase: true,
          trim: true,
        },
      ],
      default: [],
    },
    attributes: {
      type: [
        {
          _id: false,
          name: {
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
      ],
      default: [],
    },
  },
  {
    collection: 'products',
    timestamps: true,
    versionKey: false,
  },
);

productSchema.index({
  categoryId: 1,
  status: 1,
});

productSchema.index({
  isFeatured: 1,
  status: 1,
});

productSchema.index({
  name: 'text',
  slug: 'text',
  sku: 'text',
  shortDescription: 'text',
  metaTitle: 'text',
  metaDescription: 'text',
  tags: 'text',
  'attributes.name': 'text',
  'attributes.value': 'text',
});

productSchema.pre('validate', function validateProductPricing(next) {
  if (this.salePrice !== null && this.salePrice !== undefined && this.salePrice > this.basePrice) {
    this.invalidate('salePrice', 'salePrice cannot be greater than basePrice');
  }

  next();
});

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export { productSchema, productStatuses };

export default Product;
