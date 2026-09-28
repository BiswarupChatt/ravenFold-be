import mongoose from 'mongoose';

const ANNOUNCEMENT_BANNER_PLACEMENT = {
  TOP_NAVBAR: 'TOP_NAVBAR',
};

const ANNOUNCEMENT_BANNER_VARIANT = {
  DEFAULT: 'DEFAULT',
  SALE: 'SALE',
  INFO: 'INFO',
  WARNING: 'WARNING',
  FESTIVE: 'FESTIVE',
};

const CAMPAIGN_DEVICE_TARGET = {
  ALL: 'ALL',
  DESKTOP: 'DESKTOP',
  MOBILE: 'MOBILE',
};

const CAMPAIGN_PAGE_TARGET = {
  ALL: 'ALL',
  HOME: 'HOME',
  PRODUCT: 'PRODUCT',
  CHECKOUT: 'CHECKOUT',
};

const CAMPAIGN_CUSTOMER_TARGET = {
  ALL: 'ALL',
  LOGGED_IN: 'LOGGED_IN',
  NEW_VISITOR: 'NEW_VISITOR',
  RETURNING_VISITOR: 'RETURNING_VISITOR',
};

const announcementBannerPlacements = Object.values(ANNOUNCEMENT_BANNER_PLACEMENT);
const announcementBannerVariants = Object.values(ANNOUNCEMENT_BANNER_VARIANT);
const campaignDeviceTargets = Object.values(CAMPAIGN_DEVICE_TARGET);
const campaignPageTargets = Object.values(CAMPAIGN_PAGE_TARGET);
const campaignCustomerTargets = Object.values(CAMPAIGN_CUSTOMER_TARGET);

const announcementBannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: '',
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    ctaLabel: {
      type: String,
      trim: true,
      default: '',
    },
    ctaUrl: {
      type: String,
      trim: true,
      default: '',
    },
    placement: {
      type: String,
      enum: announcementBannerPlacements,
      default: ANNOUNCEMENT_BANNER_PLACEMENT.TOP_NAVBAR,
      index: true,
    },
    variant: {
      type: String,
      enum: announcementBannerVariants,
      default: ANNOUNCEMENT_BANNER_VARIANT.DEFAULT,
    },
    backgroundColor: {
      type: String,
      trim: true,
      default: '',
    },
    textColor: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDismissible: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: Date,
      default: null,
      index: true,
    },
    endDate: {
      type: Date,
      default: null,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
      required: true,
      index: true,
    },
    deviceTarget: {
      type: String,
      enum: campaignDeviceTargets,
      default: CAMPAIGN_DEVICE_TARGET.ALL,
      index: true,
    },
    pageTarget: {
      type: String,
      enum: campaignPageTargets,
      default: CAMPAIGN_PAGE_TARGET.ALL,
      index: true,
    },
    customerTarget: {
      type: String,
      enum: campaignCustomerTargets,
      default: CAMPAIGN_CUSTOMER_TARGET.ALL,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    collection: 'announcement_banners',
    timestamps: true,
    versionKey: false,
  },
);

announcementBannerSchema.index({ placement: 1, isActive: 1, priority: -1 });
announcementBannerSchema.index({ isActive: 1, startDate: 1, endDate: 1, priority: -1 });
announcementBannerSchema.index({
  isActive: 1,
  deviceTarget: 1,
  pageTarget: 1,
  customerTarget: 1,
  priority: -1,
});

announcementBannerSchema.pre('validate', function validateAnnouncementBanner() {
  this.title = (this.title || '').trim();
  this.message = (this.message || '').trim();
  this.ctaLabel = (this.ctaLabel || '').trim();
  this.ctaUrl = (this.ctaUrl || '').trim();
  this.backgroundColor = (this.backgroundColor || '').trim();
  this.textColor = (this.textColor || '').trim();
  this.priority = Number(this.priority || 0);

  if (!this.message) {
    this.invalidate('message', 'message is required');
  }

  if (!Number.isInteger(this.priority)) {
    this.invalidate('priority', 'priority must be an integer');
  }

  if (this.startDate && this.endDate && this.startDate > this.endDate) {
    this.invalidate('endDate', 'endDate must be greater than or equal to startDate');
  }
});

const AnnouncementBanner = mongoose.models.AnnouncementBanner
  || mongoose.model('AnnouncementBanner', announcementBannerSchema);

export {
  ANNOUNCEMENT_BANNER_PLACEMENT,
  ANNOUNCEMENT_BANNER_VARIANT,
  CAMPAIGN_CUSTOMER_TARGET,
  CAMPAIGN_DEVICE_TARGET,
  CAMPAIGN_PAGE_TARGET,
  announcementBannerPlacements,
  announcementBannerSchema,
  announcementBannerVariants,
  campaignCustomerTargets,
  campaignDeviceTargets,
  campaignPageTargets,
};

export default AnnouncementBanner;
