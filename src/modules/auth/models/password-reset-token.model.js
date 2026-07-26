import mongoose from 'mongoose';

const passwordResetTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    consumedAt: {
      type: Date,
      default: null,
      index: true,
    },
    requestedByIp: {
      type: String,
      trim: true,
      default: '',
    },
    requestedUserAgent: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    collection: 'password_reset_tokens',
    timestamps: true,
    versionKey: false,
  },
);

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordResetToken = mongoose.models.PasswordResetToken || mongoose.model('PasswordResetToken', passwordResetTokenSchema);

export { passwordResetTokenSchema };

export default PasswordResetToken;
