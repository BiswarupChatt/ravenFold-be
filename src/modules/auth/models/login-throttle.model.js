import mongoose from 'mongoose';

const loginThrottleSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      index: true,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    failureCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    firstFailureAt: {
      type: Date,
      default: null,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    blockedUntil: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    collection: 'auth_login_throttles',
    timestamps: true,
    versionKey: false,
  },
);

loginThrottleSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

const LoginThrottle = mongoose.models.LoginThrottle || mongoose.model('LoginThrottle', loginThrottleSchema);

export { loginThrottleSchema };

export default LoginThrottle;
