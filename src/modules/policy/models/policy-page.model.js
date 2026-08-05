import mongoose from 'mongoose';

const POLICY_PAGE_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
};

const policyPageStatuses = Object.values(POLICY_PAGE_STATUS);

const protectedPolicySlugs = [
  'shipping-and-delivery-policy',
  'cancellation-policy',
  'return-refund-and-exchange-policy',
  'product-warranty-and-leather-care-policy',
  'privacy-and-cookie-policy',
  'terms-and-conditions',
  'grievance-redressal-and-contact-information',
  'corporate-gifting-policy',
];

const policySeoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    _id: false,
  },
);

const policyPageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    contentHtml: {
      type: String,
      default: '',
    },
    contentText: {
      type: String,
      default: '',
      index: true,
    },
    status: {
      type: String,
      enum: policyPageStatuses,
      default: POLICY_PAGE_STATUS.DRAFT,
      index: true,
    },
    effectiveDate: {
      type: Date,
      default: null,
    },
    seo: {
      type: policySeoSchema,
      default: () => ({}),
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    isSystemPolicy: {
      type: Boolean,
      default: false,
      index: true,
    },
    showInFooter: {
      type: Boolean,
      default: false,
      index: true,
    },
    footerLabel: {
      type: String,
      trim: true,
      default: '',
    },
    footerSortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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
    collection: 'policy_pages',
    timestamps: true,
    versionKey: false,
  },
);

policyPageSchema.index({ slug: 1, status: 1 });
policyPageSchema.index({ status: 1, showInFooter: 1, footerSortOrder: 1, title: 1 });
policyPageSchema.index({
  title: 'text',
  slug: 'text',
  contentText: 'text',
  'seo.title': 'text',
  'seo.description': 'text',
});

policyPageSchema.pre('validate', function validatePolicyPage() {
  this.title = String(this.title || '').trim();
  this.slug = String(this.slug || '').trim().toLowerCase();
  this.contentHtml = String(this.contentHtml || '');
  this.contentText = String(this.contentText || '').trim();
  this.seo = {
    title: String(this.seo?.title || '').trim(),
    description: String(this.seo?.description || '').trim(),
  };
  this.version = Math.max(Number(this.version || 1), 1);
  this.isSystemPolicy = Boolean(this.isSystemPolicy || protectedPolicySlugs.includes(this.slug));
  this.showInFooter = Boolean(this.showInFooter);
  this.footerLabel = String(this.footerLabel || '').trim();
  this.footerSortOrder = Number.isFinite(Number(this.footerSortOrder)) ? Number(this.footerSortOrder) : 0;

  if (!this.title) {
    this.invalidate('title', 'title is required');
  }

  if (!this.slug) {
    this.invalidate('slug', 'slug is required');
  }
});

const PolicyPage = mongoose.models.PolicyPage || mongoose.model('PolicyPage', policyPageSchema);

export {
  POLICY_PAGE_STATUS,
  policyPageSchema,
  policyPageStatuses,
  policySeoSchema,
  protectedPolicySlugs,
};

export default PolicyPage;
