import mongoose from 'mongoose';

import ROLES from '@/common/constants/roles.constant.js';
import { normalizeUserNameParts } from '@/common/utils/user-name.util.js';

const allowedRoles = Object.values(ROLES);
const allowedAuthProviders = ['google', 'facebook', 'apple', 'firebase'];

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true,
      default: '',
    },
    lastName: {
      type: String,
      trim: true,
      default: '',
    },
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
    gender: {
      type: String,
      trim: true,
      default: '',
    },
    dob: {
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
            enum: allowedAuthProviders,
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
    adminMfa: {
      enabled: {
        type: Boolean,
        default: false,
      },
      enabledAt: {
        type: Date,
        default: null,
      },
      lastVerifiedAt: {
        type: Date,
        default: null,
      },
      pendingSecretEncrypted: {
        type: String,
        trim: true,
        default: '',
      },
      secretEncrypted: {
        type: String,
        trim: true,
        default: '',
      },
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
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    collection: 'users',
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.adminMfa;
        delete ret.passwordHash;
        return ret;
      },
    },
    toObject: {
      transform: (doc, ret) => {
        delete ret.adminMfa;
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

userSchema.pre('validate', function syncUserNameFields() {
  const normalizedName = normalizeUserNameParts({
    firstName: this.firstName,
    lastName: this.lastName,
    name: this.name,
  });

  this.firstName = normalizedName.firstName;
  this.lastName = normalizedName.lastName;
  this.name = normalizedName.name;
});

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
