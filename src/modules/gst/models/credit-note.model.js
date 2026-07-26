import mongoose from 'mongoose';

import { CREDIT_NOTE_STATUS } from '@/modules/gst/gst.constants.js';

const creditNoteItemSchema = new mongoose.Schema(
  {
    invoiceItemOrderItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem', default: null },
    description: { type: String, trim: true, default: '' },
    quantity: { type: Number, min: 0, default: 0 },
    taxableValue: { type: Number, min: 0, default: 0 },
    cgstAmount: { type: Number, min: 0, default: 0 },
    sgstAmount: { type: Number, min: 0, default: 0 },
    igstAmount: { type: Number, min: 0, default: 0 },
    cessAmount: { type: Number, min: 0, default: 0 },
    totalAmount: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const creditNoteSchema = new mongoose.Schema(
  {
    creditNoteNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reason: { type: String, trim: true, default: '' },
    refundReference: { type: String, trim: true, default: '' },
    status: { type: String, enum: Object.values(CREDIT_NOTE_STATUS), default: CREDIT_NOTE_STATUS.ISSUED },
    issuedAt: { type: Date, default: Date.now, index: true },
    items: { type: [creditNoteItemSchema], default: [] },
    totals: { type: Object, default: () => ({}) },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    collection: 'credit_notes',
    timestamps: true,
    versionKey: false,
  },
);

const CreditNote = mongoose.models.CreditNote || mongoose.model('CreditNote', creditNoteSchema);

export { creditNoteItemSchema, creditNoteSchema };

export default CreditNote;
