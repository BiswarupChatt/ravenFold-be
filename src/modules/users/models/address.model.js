import mongoose from 'mongoose';

const addressTypes = ['home', 'work'];

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    addressLine1: {
      type: String,
      required: true,
      trim: true,
    },
    addressLine2: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    addressType: {
      type: String,
      enum: addressTypes,
      default: 'home',
    },
  },
  {
    collection: 'addresses',
    timestamps: true,
    versionKey: false,
  },
);

addressSchema.index(
  {
    userId: 1,
    isDefault: 1,
  },
  {
    partialFilterExpression: {
      isDefault: true,
    },
    unique: true,
  },
);

const Address = mongoose.models.Address || mongoose.model('Address', addressSchema);

export { addressSchema, addressTypes };

export default Address;
