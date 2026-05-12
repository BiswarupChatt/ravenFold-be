import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema(
  {
    allowBackorder: {
      type: Boolean,
      default: false,
    },
    lowStockThreshold: {
      type: Number,
      min: 0,
      default: 0,
    },
    quantityAvailable: {
      type: Number,
      min: 0,
      default: 0,
    },
    quantityReserved: {
      type: Number,
      min: 0,
      default: 0,
    },
    quantitySold: {
      type: Number,
      min: 0,
      default: 0,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductVariant',
      required: true,
      index: true,
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
    },
  },
  {
    collection: 'inventory_items',
    timestamps: true,
    versionKey: false,
  },
);

inventoryItemSchema.index({ variantId: 1, warehouseId: 1 }, { unique: true });

const InventoryItem =
  mongoose.models.InventoryItem || mongoose.model('InventoryItem', inventoryItemSchema);

export { inventoryItemSchema };

export default InventoryItem;
