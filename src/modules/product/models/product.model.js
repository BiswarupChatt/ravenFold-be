import mongoose from 'mongoose';

const productStatuses = ['draft', 'active', 'inactive'];
const weightUnits = ['g', 'kg', 'lb', 'oz'];
const dimensionUnits = ['cm', 'in'];

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
        default: 'kg',
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

const seoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: '',
    },
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
    canonicalUrl: {
      type: String,
      trim: true,
      default: '',
    },
    noIndex: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  },
);

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
    seo: {
      type: seoSchema,
      default: () => ({}),
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
    shipping: {
      type: shippingSchema,
      default: () => ({}),
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    reviewCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    ratingDistribution: {
      type: Object,
      default: () => ({
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      }),
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
  'seo.title': 'text',
  'seo.description': 'text',
  'seo.keywords': 'text',
  tags: 'text',
  'attributes.name': 'text',
  'attributes.value': 'text',
});

productSchema.pre('validate', function validateProductPricing() {
  if (this.salePrice !== null && this.salePrice !== undefined && this.salePrice > this.basePrice) {
    this.invalidate('salePrice', 'salePrice cannot be greater than basePrice');
  }

  this.averageRating = Number(Number(this.averageRating || 0).toFixed(1));
  this.reviewCount = Number.isInteger(this.reviewCount) && this.reviewCount >= 0 ? this.reviewCount : 0;
});

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export { dimensionUnits, productSchema, productStatuses, seoSchema, shippingSchema, weightUnits };

export default Product;
