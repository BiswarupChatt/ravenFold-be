import mongoose from 'mongoose';

const socialLinkSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    url: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const settingsImageAssetSchema = new mongoose.Schema(
  {
    alt: { type: String, trim: true, default: '' },
    publicId: { type: String, trim: true, default: '' },
    url: { type: String, trim: true, required: true },
  },
  { _id: false },
);

const contactSchema = new mongoose.Schema(
  {
    supportEmail: { type: String, trim: true, lowercase: true, default: '' },
    supportPhone: { type: String, trim: true, default: '' },
    whatsappNumber: { type: String, trim: true, default: '' },
    businessHours: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const seoSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const featureFlagsSchema = new mongoose.Schema(
  {
    showBlog: { type: Boolean, default: false },
    enableReviews: { type: Boolean, default: true },
    enableWishlist: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },
    showNavbarSearch: { type: Boolean, default: false },
  },
  { _id: false },
);

const siteSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'default',
      unique: true,
      immutable: true,
      index: true,
    },
    brandName: {
      type: String,
      trim: true,
      default: 'Raven Fold',
    },
    logo: {
      type: settingsImageAssetSchema,
      default: null,
    },
    favicon: {
      type: settingsImageAssetSchema,
      default: null,
    },
    copyrightText: {
      type: String,
      trim: true,
      default: '',
    },
    contact: {
      type: contactSchema,
      default: () => ({}),
    },
    socialLinks: {
      type: [socialLinkSchema],
      default: [],
    },
    seo: {
      type: seoSchema,
      default: () => ({}),
    },
    featureFlags: {
      type: featureFlagsSchema,
      default: () => ({}),
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    collection: 'site_settings',
    timestamps: true,
    versionKey: false,
  },
);

siteSettingsSchema.pre('validate', function validateSiteSettings() {
  this.brandName = String(this.brandName || '').trim() || 'Raven Fold';
  this.copyrightText = String(this.copyrightText || '').trim();
  this.socialLinks = Array.isArray(this.socialLinks)
    ? this.socialLinks.filter((link) => String(link?.label || '').trim() || String(link?.url || '').trim())
    : [];
});

const SiteSettings = mongoose.models.SiteSettings
  || mongoose.model('SiteSettings', siteSettingsSchema);

export {
  contactSchema,
  featureFlagsSchema,
  seoSchema,
  settingsImageAssetSchema,
  siteSettingsSchema,
  socialLinkSchema,
};

export default SiteSettings;
