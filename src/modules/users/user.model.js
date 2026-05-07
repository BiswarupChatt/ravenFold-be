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
    passwordHash: {
      type: String,
      required: true,
      select: false,
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

const User = mongoose.models.User || mongoose.model('User', userSchema);

export { userSchema };

export default User;
