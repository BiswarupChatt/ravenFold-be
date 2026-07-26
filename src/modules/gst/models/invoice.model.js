import mongoose from 'mongoose';

import {
  INVOICE_STATUS,
  INVOICE_TYPES,
  SUPPLY_TYPES,
} from '@/modules/gst/gst.constants.js';

const gstPartyAddressSchema = new mongoose.Schema(
  {
    addressLine1: { type: String, trim: true, default: '' },
    addressLine2: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: 'India' },
    fullName: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    stateCode: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const sellerSnapshotSchema = new mongoose.Schema(
  {
    businessLegalName: { type: String, trim: true, default: '' },
    tradeName: { type: String, trim: true, default: '' },
    gstin: { type: String, trim: true, uppercase: true, default: '' },
    pan: { type: String, trim: true, uppercase: true, default: '' },
    registeredAddress: { type: gstPartyAddressSchema, default: () => ({}) },
    contactNumber: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    businessLogoUrl: { type: String, trim: true, default: '' },
    authorisedSignatory: { type: Object, default: () => ({}) },
    bankDetails: { type: Object, default: () => ({}) },
    invoiceTerms: { type: String, trim: true, default: '' },
    invoiceNotes: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const customerSnapshotSchema = new mongoose.Schema(
  {
    customerName: { type: String, trim: true, default: '' },
    businessName: { type: String, trim: true, default: '' },
    tradeName: { type: String, trim: true, default: '' },
    gstin: { type: String, trim: true, uppercase: true, default: '' },
    email: { type: String, trim: true, default: '' },
    contactNumber: { type: String, trim: true, default: '' },
    billingAddress: { type: gstPartyAddressSchema, default: () => ({}) },
    shippingAddress: { type: gstPartyAddressSchema, default: () => ({}) },
  },
  { _id: false },
);

const invoiceItemSchema = new mongoose.Schema(
  {
    orderItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
    description: { type: String, trim: true, default: '' },
    hsnCode: { type: String, trim: true, default: '' },
    quantity: { type: Number, min: 0, required: true },
    unitPrice: { type: Number, min: 0, required: true },
    discountAmount: { type: Number, min: 0, default: 0 },
    taxableValue: { type: Number, min: 0, default: 0 },
    gstRate: { type: Number, min: 0, default: 0 },
    cgstRate: { type: Number, min: 0, default: 0 },
    sgstRate: { type: Number, min: 0, default: 0 },
    igstRate: { type: Number, min: 0, default: 0 },
    cessRate: { type: Number, min: 0, default: 0 },
    cgstAmount: { type: Number, min: 0, default: 0 },
    sgstAmount: { type: Number, min: 0, default: 0 },
    igstAmount: { type: Number, min: 0, default: 0 },
    cessAmount: { type: Number, min: 0, default: 0 },
    lineTotal: { type: Number, min: 0, default: 0 },
    taxInclusive: { type: Boolean, default: true },
    exempt: { type: Boolean, default: false },
    exemptionReason: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const invoiceSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    invoiceNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    invoiceDate: { type: Date, required: true, index: true },
    financialYear: { type: String, required: true, trim: true, index: true },
    invoiceType: { type: String, enum: Object.values(INVOICE_TYPES), required: true, index: true },
    supplyType: { type: String, enum: Object.values(SUPPLY_TYPES), required: true, index: true },
    placeOfSupply: { type: String, trim: true, default: '' },
    placeOfSupplyStateCode: { type: String, trim: true, default: '' },
    sellerSnapshot: { type: sellerSnapshotSchema, default: () => ({}) },
    customerSnapshot: { type: customerSnapshotSchema, default: () => ({}) },
    orderNumber: { type: String, trim: true, uppercase: true, default: '', index: true },
    orderDate: { type: Date, default: null },
    paymentMethod: { type: String, trim: true, default: '' },
    paymentStatus: { type: String, trim: true, default: '' },
    items: { type: [invoiceItemSchema], default: [] },
    shipping: { type: Object, default: () => ({}) },
    totals: { type: Object, default: () => ({}) },
    pdfPath: { type: String, trim: true, default: '' },
    pdfGeneratedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: Object.values(INVOICE_STATUS),
      default: INVOICE_STATUS.PENDING,
      index: true,
    },
    generationError: { type: String, trim: true, default: '' },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, trim: true, default: '' },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    collection: 'invoices',
    timestamps: true,
    versionKey: false,
  },
);

invoiceSchema.index({ invoiceDate: -1, createdAt: -1 });
invoiceSchema.index({ invoiceType: 1, financialYear: 1 });
invoiceSchema.index({ supplyType: 1, 'customerSnapshot.gstin': 1 });

const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

export {
  customerSnapshotSchema,
  gstPartyAddressSchema,
  invoiceItemSchema,
  invoiceSchema,
  sellerSnapshotSchema,
};

export default Invoice;
