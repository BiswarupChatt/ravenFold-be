import mongoose from 'mongoose';

import ROLES from '@/common/constants/roles.constant.js';

const allowedRoles = Object.values(ROLES);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    avatar: {
      type: String,
      trim: true,
      default: '',
    },
    passwordHash: {
      type: String,
      select: false,
    },
    authProviders: {
      type: [
        {
          provider: {
            type: String,
            required: true,
            enum: ['google', 'facebook', 'apple'],
          },
          providerUserId: {
            type: String,
            required: true,
            trim: true,
          },
          email: {
            type: String,
            lowercase: true,
            trim: true,
            default: '',
          },
          name: {
            type: String,
            trim: true,
            default: '',
          },
          avatar: {
            type: String,
            trim: true,
            default: '',
          },
          linkedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    role: {
      type: String,
      enum: allowedRoles,
      default: ROLES.CUSTOMER,
    },
    roles: {
      type: [
        {
          type: String,
          enum: allowedRoles,
        },
      ],
      default: [ROLES.CUSTOMER],
    },
  },
  {
    collection: 'users',
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        return ret;
      },
    },
    toObject: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

userSchema.index(
  {
    'authProviders.provider': 1,
    'authProviders.providerUserId': 1,
  },
  {
    sparse: true,
    unique: true,
  },
);

const User = mongoose.models.User || mongoose.model('User', userSchema);

export { userSchema };

export default User;
