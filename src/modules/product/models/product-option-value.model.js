import mongoose from 'mongoose';

const productOptionValueSchema = new mongoose.Schema(
  {
    productOptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductOption',
      required: true,
      index: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    collection: 'product_option_values',
    timestamps: true,
    versionKey: false,
  },
);

productOptionValueSchema.index({ productOptionId: 1, value: 1 }, { unique: true });

const ProductOptionValue = mongoose.models.ProductOptionValue ||
  mongoose.model('ProductOptionValue', productOptionValueSchema);

export { productOptionValueSchema };

export default ProductOptionValue;
