import mongoose from 'mongoose';

const invoiceCounterSchema = new mongoose.Schema(
  {
    financialYear: {
      type: String,
      required: true,
      trim: true,
    },
    prefix: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    sequence: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    collection: 'invoice_counters',
    timestamps: true,
    versionKey: false,
  },
);

invoiceCounterSchema.index({ financialYear: 1, prefix: 1 }, { unique: true });

const InvoiceCounter = mongoose.models.InvoiceCounter || mongoose.model('InvoiceCounter', invoiceCounterSchema);

export { invoiceCounterSchema };

export default InvoiceCounter;
