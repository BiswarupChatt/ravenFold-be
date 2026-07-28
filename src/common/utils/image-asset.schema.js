import mongoose from 'mongoose';

const imageAssetSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      trim: true,
      default: '',
    },
    url: {
      type: String,
      trim: true,
      required: true,
    },
  },
  {
    _id: false,
  },
);

export { imageAssetSchema };

export default imageAssetSchema;
