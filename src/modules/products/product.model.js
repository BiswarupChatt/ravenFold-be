import mongoose from 'mongoose';

const PRODUCT_STATUSES = Object.freeze({
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  DRAFT: 'draft',
});

const PRODUCT_TYPES = Object.freeze({
  BUNDLE: 'bundle',
  DIGITAL: 'digital',
  SIMPLE: 'simple',
  VARIABLE: 'variable',
});

const allowedProductStatuses = Object.values(PRODUCT_STATUSES);
const allowedProductTypes = Object.values(PRODUCT_TYPES);

const seoSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      trim: true,
      default: '',
    },
    keywords: {
      type: [
        {
          type: String,
          lowercase: true,
          trim: true,
        },
      ],
      default: [],
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    _id: false,
  },
);

const shippingSchema = new mongoose.Schema(
  {
    height: {
      type: Number,
      min: 0,
      default: 0,
    },
    length: {
      type: Number,
      min: 0,
      default: 0,
    },
    weight: {
      type: Number,
      min: 0,
      default: 0,
    },
    width: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    _id: false,
  },
);

const productSchema = new mongoose.Schema(
  {
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      default: null,
    },
    categoryIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Category',
        },
      ],
      default: [],
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    hasVariants: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    mediaIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Media',
        },
      ],
      default: [],
    },
    productType: {
      type: String,
      enum: allowedProductTypes,
      default: PRODUCT_TYPES.SIMPLE,
      index: true,
    },
    seo: {
      type: seoSchema,
      default: () => ({}),
    },
    shipping: {
      type: shippingSchema,
      default: () => ({}),
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    status: {
      type: String,
      enum: allowedProductStatuses,
      default: PRODUCT_STATUSES.DRAFT,
      index: true,
    },
    tagIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Tag',
        },
      ],
      default: [],
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
    thumbnail: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
  },
  {
    collection: 'products',
    timestamps: true,
    versionKey: false,
  },
);

productSchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);
productSchema.index({
  description: 'text',
  shortDescription: 'text',
  tags: 'text',
  title: 'text',
});

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export {
  allowedProductStatuses,
  allowedProductTypes,
  productSchema,
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
  seoSchema,
  shippingSchema,
};

export default Product;
