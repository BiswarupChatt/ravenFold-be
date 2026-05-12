import mongoose from 'mongoose';

const INVENTORY_TRANSACTION_TYPES = Object.freeze({
  ADJUSTMENT: 'adjustment',
  CANCEL: 'cancel',
  DAMAGED: 'damaged',
  PURCHASE: 'purchase',
  RETURN: 'return',
  SALE: 'sale',
});

const allowedInventoryTransactionTypes = Object.values(INVENTORY_TRANSACTION_TYPES);

const inventoryTransactionSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
      index: true,
    },
    newQuantity: {
      type: Number,
      min: 0,
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    previousQuantity: {
      type: Number,
      min: 0,
      required: true,
    },
    quantity: {
      type: Number,
      min: 1,
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    referenceType: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: allowedInventoryTransactionTypes,
      required: true,
      index: true,
    },
  },
  {
    collection: 'inventory_transactions',
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
    versionKey: false,
  },
);

const InventoryTransaction =
  mongoose.models.InventoryTransaction ||
  mongoose.model('InventoryTransaction', inventoryTransactionSchema);

export {
  allowedInventoryTransactionTypes,
  inventoryTransactionSchema,
  INVENTORY_TRANSACTION_TYPES,
};

export default InventoryTransaction;
