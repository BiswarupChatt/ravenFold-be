import mongoose from 'mongoose';

const VARIANT_STATUSES = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

const allowedVariantStatuses = Object.values(VARIANT_STATUSES);

const variantAttributeSchema = new mongoose.Schema(
  {
    attributeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attribute',
      required: true,
    },
    attributeValueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttributeValue',
      required: true,
    },
  },
  {
    _id: false,
  },
);

const buildAttributeSignature = (attributes = []) => {
  if (!attributes.length) {
    return 'default';
  }

  return attributes
    .map((attribute) => `${attribute.attributeId?.toString()}:${attribute.attributeValueId?.toString()}`)
    .sort()
    .join('|');
};

const productVariantSchema = new mongoose.Schema(
  {
    attributeSignature: {
      type: String,
      required: true,
      trim: true,
      default: 'default',
    },
    attributes: {
      type: [variantAttributeSchema],
      default: [],
    },
    barcode: {
      type: String,
      trim: true,
      default: '',
    },
    compareAtPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    costPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      default: null,
    },
    isDefault: {
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
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: allowedVariantStatuses,
      default: VARIANT_STATUSES.ACTIVE,
      index: true,
    },
  },
  {
    collection: 'product_variants',
    timestamps: true,
    versionKey: false,
  },
);

productVariantSchema.pre('validate', function setAttributeSignature() {
  this.attributeSignature = buildAttributeSignature(this.attributes);
});

productVariantSchema.index(
  { sku: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);
productVariantSchema.index(
  { productId: 1, attributeSignature: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);
productVariantSchema.index(
  { productId: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true, isDeleted: false },
  },
);

const ProductVariant =
  mongoose.models.ProductVariant || mongoose.model('ProductVariant', productVariantSchema);

export {
  allowedVariantStatuses,
  buildAttributeSignature,
  productVariantSchema,
  variantAttributeSchema,
  VARIANT_STATUSES,
};

export default ProductVariant;
