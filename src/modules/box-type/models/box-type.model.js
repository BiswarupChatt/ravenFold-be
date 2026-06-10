import mongoose from 'mongoose';

const boxTypeSchema = new mongoose.Schema(
  {
    breadth: {
      type: Number,
      min: 0,
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    height: {
      type: Number,
      min: 0,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    length: {
      type: Number,
      min: 0,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    weight: {
      type: Number,
      min: 0,
      required: true,
    },
  },
  {
    collection: 'box_types',
    timestamps: true,
    versionKey: false,
  },
);

boxTypeSchema.index({
  name: 'text',
  code: 'text',
});

const BoxType = mongoose.models.BoxType || mongoose.model('BoxType', boxTypeSchema);

export { boxTypeSchema };

export default BoxType;
