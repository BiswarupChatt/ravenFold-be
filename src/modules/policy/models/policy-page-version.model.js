import mongoose from 'mongoose';

import { policyPageStatuses, policySeoSchema } from '@/modules/policy/models/policy-page.model.js';

const policyPageVersionSchema = new mongoose.Schema(
  {
    policyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PolicyPage',
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    contentHtml: {
      type: String,
      default: '',
    },
    contentText: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: policyPageStatuses,
      required: true,
    },
    effectiveDate: {
      type: Date,
      default: null,
    },
    seo: {
      type: policySeoSchema,
      default: () => ({}),
    },
    showInFooter: {
      type: Boolean,
      default: false,
    },
    footerLabel: {
      type: String,
      trim: true,
      default: '',
    },
    footerSortOrder: {
      type: Number,
      default: 0,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'policy_page_versions',
    timestamps: true,
    versionKey: false,
  },
);

policyPageVersionSchema.index({ policyId: 1, version: -1 }, { unique: true });

const PolicyPageVersion = mongoose.models.PolicyPageVersion
  || mongoose.model('PolicyPageVersion', policyPageVersionSchema);

export { policyPageVersionSchema };

export default PolicyPageVersion;
