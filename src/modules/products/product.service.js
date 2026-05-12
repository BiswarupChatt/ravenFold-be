import mongoose from 'mongoose';

import ApiError from '@/common/errors/api.error.js';
import { sendSuccess } from '@/common/helpers/response.helper.js';
import { createSlug } from '@/common/utils/slug.util.js';
import { getPagination } from '@/common/utils/pagination.util.js';
import Product, { PRODUCT_STATUSES, PRODUCT_TYPES } from '@/modules/products/product.model.js';
import ProductVariant, { VARIANT_STATUSES } from '@/modules/products/productVariant.model.js';

const productSorts = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  title: { title: 1 },
  '-title': { title: -1 },
  updated: { updatedAt: -1 },
};

const assertDatabaseReady = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new ApiError(503, 'Database connection is not ready. Check MONGO_URI and start MongoDB.');
  }
};

const normalizeId = (value) => {
  return value?._id?.toString?.() || value?.toString?.() || value || null;
};

const normalizeIdArray = (values = []) => {
  return values.map((value) => normalizeId(value)).filter(Boolean);
};

const escapeRegExp = (value) => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const getStatusData = () => {
  return {
    module: 'products',
  };
};

const formatVariant = (variant) => {
  const source = variant?.toObject instanceof Function ? variant.toObject() : variant;

  if (!source) {
    return null;
  }

  return {
    id: normalizeId(source._id),
    productId: normalizeId(source.productId),
    inventoryItemId: normalizeId(source.inventoryItemId),
    sku: source.sku,
    barcode: source.barcode || '',
    price: source.price,
    compareAtPrice: source.compareAtPrice,
    costPrice: source.costPrice,
    attributes: source.attributes || [],
    attributeSignature: source.attributeSignature,
    mediaIds: normalizeIdArray(source.mediaIds),
    isDefault: Boolean(source.isDefault),
    status: source.status,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
};

const formatProduct = (product, options = {}) => {
  const source = product?.toObject instanceof Function ? product.toObject() : product;

  if (!source) {
    return null;
  }

  const formatted = {
    id: normalizeId(source._id),
    title: source.title,
    slug: source.slug,
    description: source.description || '',
    shortDescription: source.shortDescription || '',
    productType: source.productType,
    status: source.status,
    hasVariants: Boolean(source.hasVariants),
    brandId: normalizeId(source.brandId),
    categoryIds: normalizeIdArray(source.categoryIds),
    tagIds: normalizeIdArray(source.tagIds),
    tags: source.tags || [],
    thumbnail: normalizeId(source.thumbnail),
    mediaIds: normalizeIdArray(source.mediaIds),
    seo: source.seo || {},
    shipping: source.shipping || {},
    createdBy: normalizeId(source.createdBy),
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };

  if (options.variants) {
    formatted.variants = options.variants.map(formatVariant).filter(Boolean);
  }

  return formatted;
};

const buildProductFilter = (query = {}) => {
  const filter = {
    isDeleted: false,
  };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.productType) {
    filter.productType = query.productType;
  }

  if (query.categoryId) {
    filter.categoryIds = query.categoryId;
  }

  if (query.search) {
    const searchRegex = new RegExp(escapeRegExp(query.search), 'i');

    filter.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { shortDescription: searchRegex },
      { tags: String(query.search).trim().toLowerCase() },
    ];
  }

  return filter;
};

const getSort = (sort) => {
  return productSorts[sort] || productSorts.newest;
};

const buildCreatePayload = (payload = {}, authUser = null) => {
  const productData = {
    ...payload,
  };

  if (!productData.slug && productData.title) {
    productData.slug = createSlug(productData.title);
  }

  if (!productData.slug) {
    throw new ApiError(400, 'Product slug is required');
  }

  if (productData.productType === PRODUCT_TYPES.VARIABLE && payload.hasVariants === undefined) {
    productData.hasVariants = true;
  }

  if (authUser?.id) {
    productData.createdBy = authUser.id;
  }

  return productData;
};

const buildUpdatePayload = (payload = {}) => {
  const updateData = {
    ...payload,
  };

  if (updateData.productType === PRODUCT_TYPES.VARIABLE && payload.hasVariants === undefined) {
    updateData.hasVariants = true;
  }

  return updateData;
};

const handleDuplicateProductError = (error) => {
  if (error?.code === 11000 && error?.keyPattern?.slug) {
    throw new ApiError(409, 'Product slug already exists');
  }

  throw error;
};

const findProductByIdForWrite = async (productId) => {
  assertDatabaseReady();

  const product = await Product.findOne({
    _id: productId,
    isDeleted: false,
  }).exec();

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  return product;
};

const getProductIdentifierFilter = (identifier) => {
  const normalizedIdentifier = String(identifier || '').trim();

  if (!normalizedIdentifier) {
    throw new ApiError(400, 'Product identifier is required');
  }

  if (mongoose.isValidObjectId(normalizedIdentifier)) {
    return { _id: normalizedIdentifier };
  }

  return {
    slug: normalizedIdentifier.toLowerCase(),
  };
};

const listProductRecords = async (query = {}) => {
  assertDatabaseReady();

  const { page, limit, skip } = getPagination(query);
  const filter = buildProductFilter(query);
  const sort = getSort(query.sort);

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(limit).lean().exec(),
    Product.countDocuments(filter).exec(),
  ]);

  return {
    products: products.map((product) => formatProduct(product)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getProductRecord = async (identifier) => {
  assertDatabaseReady();

  const product = await Product.findOne({
    ...getProductIdentifierFilter(identifier),
    isDeleted: false,
  })
    .lean()
    .exec();

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const variants = await ProductVariant.find({
    productId: product._id,
    isDeleted: false,
  })
    .sort({ isDefault: -1, createdAt: 1 })
    .lean()
    .exec();

  return formatProduct(product, { variants });
};

const createProductRecord = async (payload, authUser = null) => {
  assertDatabaseReady();

  try {
    const product = await Product.create(buildCreatePayload(payload, authUser));

    return formatProduct(product);
  } catch (error) {
    handleDuplicateProductError(error);
  }
};

const updateProductRecord = async (productId, payload) => {
  const product = await findProductByIdForWrite(productId);
  const updateData = buildUpdatePayload(payload);

  Object.assign(product, updateData);

  try {
    await product.save();

    return formatProduct(product);
  } catch (error) {
    handleDuplicateProductError(error);
  }
};

const deleteProductRecord = async (productId) => {
  const product = await findProductByIdForWrite(productId);
  const deletedAt = new Date();

  product.isDeleted = true;
  product.deletedAt = deletedAt;
  product.status = PRODUCT_STATUSES.ARCHIVED;

  await product.save();
  await ProductVariant.updateMany(
    {
      productId: product._id,
      isDeleted: false,
    },
    {
      $set: {
        deletedAt,
        isDeleted: true,
        status: VARIANT_STATUSES.INACTIVE,
      },
    },
  ).exec();

  return {
    id: normalizeId(product._id),
    deleted: true,
  };
};

const getStatus = async (req, res) => {
  return sendSuccess(res, getStatusData(), 'Products module ready');
};

const listProducts = async (req, res) => {
  return sendSuccess(res, await listProductRecords(req.query), 'Products fetched');
};

const getProduct = async (req, res) => {
  return sendSuccess(res, await getProductRecord(req.params.identifier), 'Product fetched');
};

const createProduct = async (req, res) => {
  return sendSuccess(res, await createProductRecord(req.body, req.user), 'Product created', 201);
};

const updateProduct = async (req, res) => {
  return sendSuccess(res, await updateProductRecord(req.params.productId, req.body), 'Product updated');
};

const deleteProduct = async (req, res) => {
  return sendSuccess(res, await deleteProductRecord(req.params.productId), 'Product deleted');
};

export {
  createProduct,
  createProductRecord,
  deleteProduct,
  deleteProductRecord,
  formatProduct,
  getProduct,
  getProductRecord,
  getStatus,
  listProductRecords,
  listProducts,
  updateProduct,
  updateProductRecord,
};

export default {
  createProduct,
  deleteProduct,
  getProduct,
  getStatus,
  listProducts,
  updateProduct,
};
