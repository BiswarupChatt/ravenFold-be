import mongoose from 'mongoose';

const stockMovementTypes = [
  'adjustment',
  'reservation',
  'reservation_release',
  'sale',
  'return',
];

const stockMovementSchema = new mongoose.Schema(
  {
    inventoryStockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryStock',
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
    type: {
      type: String,
      enum: stockMovementTypes,
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    stockOnHandBefore: {
      type: Number,
      required: true,
    },
    stockOnHandAfter: {
      type: Number,
      required: true,
    },
    reservedQuantityBefore: {
      type: Number,
      required: true,
    },
    reservedQuantityAfter: {
      type: Number,
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
  },
  {
    collection: 'stock_movements',
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
    versionKey: false,
  },
);

stockMovementSchema.index({ productId: 1, variantId: 1, createdAt: -1 });
stockMovementSchema.index({ inventoryStockId: 1, createdAt: -1 });

stockMovementSchema.pre('validate', function validateStockMovement() {
  if (!Number.isInteger(this.quantity) || this.quantity === 0) {
    this.invalidate('quantity', 'quantity must be a non-zero integer');
  }
});

const StockMovement = mongoose.models.StockMovement || mongoose.model('StockMovement', stockMovementSchema);

export { stockMovementSchema, stockMovementTypes };

export default StockMovement;
