import mongoose from 'mongoose';

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
  },
  {
    collection: 'product_options',
    timestamps: true,
    versionKey: false,
  },
);

productOptionSchema.index({ productId: 1, name: 1 }, { unique: true });

const ProductOption = mongoose.models.ProductOption || mongoose.model('ProductOption', productOptionSchema);

export { productOptionSchema };

export default ProductOption;
