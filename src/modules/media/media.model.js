import mongoose from 'mongoose';

const MEDIA_TYPES = Object.freeze({
  IMAGE: 'image',
  VIDEO: 'video',
});

const allowedMediaTypes = Object.values(MEDIA_TYPES);

const mediaSchema = new mongoose.Schema(
  {
    alt: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    height: {
      type: Number,
      min: 0,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    mimeType: {
      type: String,
      trim: true,
      default: '',
    },
    size: {
      type: Number,
      min: 0,
      default: 0,
    },
    type: {
      type: String,
      enum: allowedMediaTypes,
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    width: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    collection: 'media',
    timestamps: true,
    versionKey: false,
  },
);

const Media = mongoose.models.Media || mongoose.model('Media', mediaSchema);

export { allowedMediaTypes, MEDIA_TYPES, mediaSchema };

export default Media;
