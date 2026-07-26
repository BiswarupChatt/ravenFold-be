import mongoose from 'mongoose';

const gstActivityLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    entityType: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    metadata: {
      type: Object,
      default: () => ({}),
    },
  },
  {
    collection: 'gst_activity_logs',
    timestamps: true,
    versionKey: false,
  },
);

gstActivityLogSchema.index({ createdAt: -1 });

const GstActivityLog = mongoose.models.GstActivityLog || mongoose.model('GstActivityLog', gstActivityLogSchema);

export { gstActivityLogSchema };

export default GstActivityLog;
