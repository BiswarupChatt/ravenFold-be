import mongoose from 'mongoose';

import { SHIPPING_GST_TREATMENTS } from '@/modules/gst/gst.constants.js';

const gstAddressSchema = new mongoose.Schema(
  {
    addressLine1: { type: String, trim: true, default: '' },
    addressLine2: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: 'India' },
    pincode: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    stateCode: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const bankDetailsSchema = new mongoose.Schema(
  {
    accountName: { type: String, trim: true, default: '' },
    accountNumber: { type: String, trim: true, default: '' },
    bankName: { type: String, trim: true, default: '' },
    branchName: { type: String, trim: true, default: '' },
    ifsc: { type: String, trim: true, uppercase: true, default: '' },
  },
  { _id: false },
);

const signatorySchema = new mongoose.Schema(
  {
    designation: { type: String, trim: true, default: '' },
    imageUrl: { type: String, trim: true, default: '' },
    name: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const gstConfigurationSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: 'default',
      unique: true,
      immutable: true,
    },
    brandName: { type: String, trim: true, default: 'Raven Fold' },
    businessLegalName: { type: String, trim: true, default: 'Aurax & Co' },
    tradeName: { type: String, trim: true, default: '' },
    gstin: { type: String, trim: true, uppercase: true, default: '' },
    pan: { type: String, trim: true, uppercase: true, default: '' },
    registeredAddress: { type: gstAddressSchema, default: () => ({}) },
    contactNumber: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    invoicePrefix: { type: String, trim: true, uppercase: true, default: 'RF' },
    invoiceNumberFormat: { type: String, trim: true, default: '{PREFIX}/{FY}/{SEQ}' },
    nextInvoiceNumber: { type: Number, min: 1, default: 1 },
    useFinancialYearNumbering: { type: Boolean, default: true },
    defaultGstRate: { type: Number, min: 0, default: 0 },
    shippingGstTreatment: {
      type: String,
      enum: Object.values(SHIPPING_GST_TREATMENTS),
      default: SHIPPING_GST_TREATMENTS.TAXABLE,
    },
    shippingGstRate: { type: Number, min: 0, default: 0 },
    businessLogoUrl: { type: String, trim: true, default: '' },
    authorisedSignatory: { type: signatorySchema, default: () => ({}) },
    bankDetails: { type: bankDetailsSchema, default: () => ({}) },
    invoiceTerms: { type: String, trim: true, default: '' },
    invoiceNotes: { type: String, trim: true, default: '' },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
  },
  {
    collection: 'gst_configurations',
    timestamps: true,
    versionKey: false,
  },
);

const GstConfiguration = mongoose.models.GstConfiguration
  || mongoose.model('GstConfiguration', gstConfigurationSchema);

export { bankDetailsSchema, gstAddressSchema, gstConfigurationSchema, signatorySchema };

export default GstConfiguration;
