import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    parentCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    image: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    collection: 'categories',
    timestamps: true,
    versionKey: false,
  },
);

categorySchema.index({
  parentCategoryId: 1,
  isActive: 1,
});

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

export { categorySchema };

export default Category;
