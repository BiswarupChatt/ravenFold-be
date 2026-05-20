import mongoose from 'mongoose';

const inventoryStockSchema = new mongoose.Schema(
  {
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
    stockOnHand: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    reservedQuantity: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    lowStockThreshold: {
      type: Number,
      min: 0,
      default: 5,
      required: true,
    },
    trackInventory: {
      type: Boolean,
      default: true,
    },
    allowBackorder: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: 'inventory_stocks',
    timestamps: true,
    versionKey: false,
  },
);

inventoryStockSchema.index({ productId: 1, variantId: 1 }, { unique: true });
inventoryStockSchema.index({ trackInventory: 1, stockOnHand: 1, reservedQuantity: 1 });

inventoryStockSchema.virtual('availableQuantity').get(function getAvailableQuantity() {
  return Math.max((this.stockOnHand || 0) - (this.reservedQuantity || 0), 0);
});

inventoryStockSchema.pre('validate', function validateInventoryStock() {
  if (!Number.isInteger(this.stockOnHand)) {
    this.invalidate('stockOnHand', 'stockOnHand must be an integer');
  }

  if (!Number.isInteger(this.reservedQuantity)) {
    this.invalidate('reservedQuantity', 'reservedQuantity must be an integer');
  }

  if (!Number.isInteger(this.lowStockThreshold)) {
    this.invalidate('lowStockThreshold', 'lowStockThreshold must be an integer');
  }

  if (!this.allowBackorder && this.reservedQuantity > this.stockOnHand) {
    this.invalidate('reservedQuantity', 'reservedQuantity cannot exceed stockOnHand unless backorders are allowed');
  }
});

const InventoryStock = mongoose.models.InventoryStock || mongoose.model('InventoryStock', inventoryStockSchema);

export { inventoryStockSchema };

export default InventoryStock;
