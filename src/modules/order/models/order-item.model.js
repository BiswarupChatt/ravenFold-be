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

const orderItemSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
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
    collection: 'order_items',
    timestamps: true,
    versionKey: false,
  },
);

orderItemSchema.index({ orderId: 1, productId: 1, variantId: 1 });

orderItemSchema.pre('validate', function validateOrderItem() {
  if (!Number.isInteger(this.quantity) || this.quantity <= 0) {
    this.invalidate('quantity', 'quantity must be a positive integer');
  }

  this.lineTotal = Number((this.quantity * this.priceAtTime).toFixed(2));
});

const OrderItem = mongoose.models.OrderItem || mongoose.model('OrderItem', orderItemSchema);

export { orderItemSchema, priceSnapshotSchema, productSnapshotSchema };

export default OrderItem;
