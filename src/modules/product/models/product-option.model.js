import mongoose from 'mongoose';

const productOptionTypes = ['color', 'size', 'other'];
const productOptionDisplayStyles = ['swatch', 'button', 'dropdown'];

const productOptionSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    optionType: {
      type: String,
      enum: productOptionTypes,
      default: 'other',
      index: true,
    },
    displayStyle: {
      type: String,
      enum: productOptionDisplayStyles,
      default: 'button',
    },
    sizeGuideImageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    collection: 'product_options',
    timestamps: true,
    versionKey: false,
  },
);

productOptionSchema.index({ productId: 1, name: 1 }, { unique: true });
productOptionSchema.index({ productId: 1, sortOrder: 1, createdAt: 1 });

const ProductOption = mongoose.models.ProductOption || mongoose.model('ProductOption', productOptionSchema);

export { productOptionDisplayStyles, productOptionSchema, productOptionTypes };

export default ProductOption;
