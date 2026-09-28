import mongoose from 'mongoose';

import { imageAssetSchema } from '@/common/utils/image-asset.schema.js';

const POPUP_DISPLAY_MODE = {
  EVERY_REFRESH: 'EVERY_REFRESH',
  ONCE_PER_SESSION: 'ONCE_PER_SESSION',
  ONCE_PER_VISITOR: 'ONCE_PER_VISITOR',
  ONCE_EVERY_X_DAYS: 'ONCE_EVERY_X_DAYS',
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

const popupDisplayModes = Object.values(POPUP_DISPLAY_MODE);
const campaignDeviceTargets = Object.values(CAMPAIGN_DEVICE_TARGET);
const campaignPageTargets = Object.values(CAMPAIGN_PAGE_TARGET);
const campaignCustomerTargets = Object.values(CAMPAIGN_CUSTOMER_TARGET);

const popupCampaignSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    image: { type: imageAssetSchema, default: null },
    fallbackLabel: { type: String, trim: true, default: 'Limited Offer' },
    ctaLabel: { type: String, trim: true, default: '' },
    ctaUrl: { type: String, trim: true, default: '' },
    showEmailInput: { type: Boolean, default: false },
    successMessage: { type: String, trim: true, default: 'Thank you for subscribing.' },
    isActive: { type: Boolean, default: true, index: true },
    isDismissible: { type: Boolean, default: true },
    displayMode: {
      type: String,
      enum: popupDisplayModes,
      default: POPUP_DISPLAY_MODE.ONCE_PER_SESSION,
      index: true,
    },
    repeatAfterDays: { type: Number, default: 7 },
    displayDelaySeconds: { type: Number, default: 2 },
    startDate: { type: Date, default: null, index: true },
    endDate: { type: Date, default: null, index: true },
    priority: { type: Number, default: 0, required: true, index: true },
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
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { collection: 'popup_campaigns', timestamps: true, versionKey: false },
);

popupCampaignSchema.index({ isActive: 1, priority: -1, createdAt: -1 });
popupCampaignSchema.index({ isActive: 1, startDate: 1, endDate: 1, priority: -1 });
popupCampaignSchema.index({
  isActive: 1,
  deviceTarget: 1,
  pageTarget: 1,
  customerTarget: 1,
  priority: -1,
});

popupCampaignSchema.pre('validate', function validatePopupCampaign() {
  this.title = (this.title || '').trim();
  this.description = (this.description || '').trim();
  this.fallbackLabel = (this.fallbackLabel || '').trim();
  this.ctaLabel = (this.ctaLabel || '').trim();
  this.ctaUrl = (this.ctaUrl || '').trim();
  this.successMessage = (this.successMessage || '').trim();
  this.priority = Number(this.priority || 0);
  this.repeatAfterDays = Number(this.repeatAfterDays || 0);
  this.displayDelaySeconds = Number(this.displayDelaySeconds || 0);

  if (!this.title) this.invalidate('title', 'title is required');
  if (!Number.isInteger(this.priority)) this.invalidate('priority', 'priority must be an integer');
  if (!Number.isInteger(this.repeatAfterDays) || this.repeatAfterDays < 1) {
    this.invalidate('repeatAfterDays', 'repeatAfterDays must be a positive integer');
  }
  if (!Number.isInteger(this.displayDelaySeconds) || this.displayDelaySeconds < 0) {
    this.invalidate('displayDelaySeconds', 'displayDelaySeconds must be a non-negative integer');
  }
  if (this.startDate && this.endDate && this.startDate > this.endDate) {
    this.invalidate('endDate', 'endDate must be greater than or equal to startDate');
  }
});

const PopupCampaign = mongoose.models.PopupCampaign || mongoose.model('PopupCampaign', popupCampaignSchema);

export {
  CAMPAIGN_CUSTOMER_TARGET,
  CAMPAIGN_DEVICE_TARGET,
  CAMPAIGN_PAGE_TARGET,
  POPUP_DISPLAY_MODE,
  campaignCustomerTargets,
  campaignDeviceTargets,
  campaignPageTargets,
  popupCampaignSchema,
  popupDisplayModes,
};
export default PopupCampaign;
