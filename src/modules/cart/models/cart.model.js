import mongoose from 'mongoose';

const cartStatuses = ['active', 'converted', 'abandoned'];

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: cartStatuses,
      default: 'active',
      index: true,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'INR',
    },
    subtotal: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    itemCount: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    totalQuantity: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    collection: 'carts',
    timestamps: true,
    versionKey: false,
  },
);

cartSchema.index(
  { userId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: 'active',
    },
  },
);

cartSchema.pre('validate', function validateCartTotals() {
  if (!Number.isInteger(this.itemCount)) {
    this.invalidate('itemCount', 'itemCount must be an integer');
  }

  if (!Number.isInteger(this.totalQuantity)) {
    this.invalidate('totalQuantity', 'totalQuantity must be an integer');
  }
});

const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);

export { cartSchema, cartStatuses };

export default Cart;
