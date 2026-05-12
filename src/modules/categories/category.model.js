import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    deletedAt: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    image: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
  },
  {
    collection: 'categories',
    timestamps: true,
    versionKey: false,
  },
);

categorySchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

export { categorySchema };

export default Category;
