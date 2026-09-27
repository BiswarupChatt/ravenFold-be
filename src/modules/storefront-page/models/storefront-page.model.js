import mongoose from 'mongoose';

const storefrontPageSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published',
      index: true,
    },
    content: {
      type: Object,
      default: () => ({}),
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    collection: 'storefront_pages',
    timestamps: true,
    versionKey: false,
  },
);

const StorefrontPage = mongoose.models.StorefrontPage
  || mongoose.model('StorefrontPage', storefrontPageSchema);

export { storefrontPageSchema };
export default StorefrontPage;
