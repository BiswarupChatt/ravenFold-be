import mongoose from 'mongoose';

const LEAD_SOURCE = {
  POPUP: 'popup',
};

const leadSources = Object.values(LEAD_SOURCE);

const leadSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'PopupCampaign', default: null, index: true },
    email: { type: String, trim: true, lowercase: true, required: true, index: true },
    source: { type: String, trim: true, default: LEAD_SOURCE.POPUP, index: true },
    pageUrl: { type: String, trim: true, default: '' },
    isSubscribed: { type: Boolean, default: true, index: true },
    subscribedAt: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { collection: 'leads', timestamps: true, versionKey: false },
);

leadSchema.index({ campaignId: 1, email: 1, source: 1 }, { unique: true });
leadSchema.index({ source: 1, createdAt: -1 });
leadSchema.index({ createdAt: -1 });

leadSchema.pre('validate', function validateLead() {
  this.email = (this.email || '').trim().toLowerCase();
  this.source = (this.source || LEAD_SOURCE.POPUP).trim().toLowerCase();
  this.pageUrl = (this.pageUrl || '').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
    this.invalidate('email', 'email must be valid');
  }
});

const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);

export { LEAD_SOURCE, leadSchema, leadSources };
export default Lead;
