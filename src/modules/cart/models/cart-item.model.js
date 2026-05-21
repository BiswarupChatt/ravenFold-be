import mongoose from 'mongoose';

const priceSnapshotSchema = new mongoose.Schema(
  {
    basePrice: {
      type: Number,
      min: 0,
      default: null,
    },
    salePrice: {
      type: Number,
      min: 0,
      default: null,
    },
    price: {
      type: Number,
      min: 0,
      required: true,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'INR',
    },
  },
  {
    _id: false,
  },
);

const productSnapshotSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: '',
    },
    slug: {
      type: String,
      trim: true,
      default: '',
    },
    sku: {
      type: String,
      trim: true,
      default: '',
    },
    image: {
      type: String,
      trim: true,
      default: '',
    },
    variantSku: {
      type: String,
      trim: true,
      default: '',
    },
    variantLabel: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    _id: false,
  },
);

const cartItemSchema = new mongoose.Schema(
  {
    cartId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cart',
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
    quantity: {
      type: Number,
      min: 1,
      required: true,
    },
    priceAtTime: {
      type: Number,
      min: 0,
      required: true,
    },
    lineTotal: {
      type: Number,
      min: 0,
      required: true,
    },
    priceSnapshot: {
      type: priceSnapshotSchema,
      required: true,
    },
    productSnapshot: {
      type: productSnapshotSchema,
      default: () => ({}),
    },
  },
  {
    collection: 'cart_items',
    timestamps: true,
    versionKey: false,
  },
);

cartItemSchema.index({ cartId: 1, productId: 1, variantId: 1 }, { unique: true });

cartItemSchema.pre('validate', function validateCartItem() {
  if (!Number.isInteger(this.quantity) || this.quantity <= 0) {
    this.invalidate('quantity', 'quantity must be a positive integer');
  }

  this.lineTotal = Number((this.quantity * this.priceAtTime).toFixed(2));
});

const CartItem = mongoose.models.CartItem || mongoose.model('CartItem', cartItemSchema);

export { cartItemSchema, priceSnapshotSchema, productSnapshotSchema };

export default CartItem;
