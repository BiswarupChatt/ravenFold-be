import mongoose from 'mongoose';

const pickupLocationSchema = new mongoose.Schema(
  {
    addressLine1: {
      type: String,
      trim: true,
      default: '',
    },
    addressLine2: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
      default: 'India',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    pickupLocation: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
      default: '',
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    collection: 'shipping_pickup_locations',
    timestamps: true,
    versionKey: false,
  },
);

pickupLocationSchema.index({
  addressLine1: 'text',
  city: 'text',
  code: 'text',
  name: 'text',
  pickupLocation: 'text',
});

const PickupLocation = mongoose.models.PickupLocation ||
  mongoose.model('PickupLocation', pickupLocationSchema);

export { pickupLocationSchema };

export default PickupLocation;
