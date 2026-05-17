import mongoose from 'mongoose';

import ApiError from '@/common/errors/api.error.js';
import { getPagination } from '@/common/utils/pagination.util.js';
import { createSlug } from '@/common/utils/slug.util.js';
import Category from '@/modules/category/models/category.model.js';
import Product, { productStatuses } from '@/modules/product/models/product.model.js';

const editableProductFields = [
  'name',
  'slug',
  'description',
  'shortDescription',
  'metaTitle',
  'metaDescription',
  'categoryId',
  'basePrice',
  'salePrice',
  'sku',
  'hasVariants',
  'images',
  'status',
  'isFeatured',
  'tags',
  'attributes',
];

const sortableProductFields = new Set(['name', 'createdAt', 'updatedAt', 'basePrice', 'salePrice']);

const hasOwn = (object, field) => Object.prototype.hasOwnProperty.call(object, field);

const assertDatabaseReady = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new ApiError(503, 'Database connection is not ready. Check MONGO_URI and start MongoDB.');
  }
};

const assertValidProductId = (productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, 'Invalid product id');
  }
};

const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const normalizeBoolean = (value, field) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === 'true') {
      return true;
    }

    if (normalizedValue === 'false') {
      return false;
    }
  }

  throw new ApiError(400, `${field} must be a boolean`);
};

const normalizeRequiredObjectId = (value, field) => {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    throw new ApiError(400, `${field} is required`);
  }

  if (!mongoose.Types.ObjectId.isValid(normalizedValue)) {
    throw new ApiError(400, `Invalid ${field}`);
  }

  return normalizedValue;
};

const normalizeMoney = (value, field, { required = false } = {}) => {
  if (value === null || value === undefined || value === '') {
    if (required) {
      throw new ApiError(400, `${field} is required`);
    }

    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new ApiError(400, `${field} must be a number`);
  }

  if (numberValue < 0) {
    throw new ApiError(400, `${field} cannot be negative`);
  }

  return Number(numberValue.toFixed(2));
};

const normalizeStatus = (value) => {
  const normalizedValue = normalizeText(value).toLowerCase();

  if (!productStatuses.includes(normalizedValue)) {
    throw new ApiError(400, `status must be one of: ${productStatuses.join(', ')}`);
  }

  return normalizedValue;
};

const normalizeStringArray = (value, field, { splitString = false, lowercase = false } = {}) => {
  if (value === null || value === undefined || value === '') {
    return [];
  }

  const rawValues = Array.isArray(value)
    ? value
    : splitString
      ? String(value).split(',')
      : [value];
  const normalizedValues = rawValues
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .map((item) => (lowercase ? item.toLowerCase() : item));

  if (rawValues.length > 0 && normalizedValues.length === 0) {
    throw new ApiError(400, `${field} cannot contain only empty values`);
  }

  return [...new Set(normalizedValues)];
};

const normalizeAttributes = (value) => {
  if (value === null || value === undefined || value === '') {
    return [];
  }

  const rawAttributes = Array.isArray(value)
    ? value
    : typeof value === 'object'
      ? Object.entries(value).map(([name, attributeValue]) => ({
          name,
          value: attributeValue,
        }))
      : null;

  if (!rawAttributes) {
    throw new ApiError(400, 'attributes must be an array of name/value pairs');
  }

  const seenAttributeNames = new Set();

  return rawAttributes.map((attribute) => {
    if (!attribute || typeof attribute !== 'object' || Array.isArray(attribute)) {
      throw new ApiError(400, 'attributes must be an array of name/value pairs');
    }

    const name = normalizeText(attribute.name);
    const attributeValue = normalizeText(attribute.value);

    if (!name || !attributeValue) {
      throw new ApiError(400, 'attributes must include name and value');
    }

    const normalizedName = name.toLowerCase();

    if (seenAttributeNames.has(normalizedName)) {
      throw new ApiError(400, 'attribute names must be unique');
    }

    seenAttributeNames.add(normalizedName);

    return {
      name,
      value: attributeValue,
    };
  });
};

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const getDocumentId = (value) => {
  if (!value) {
    return null;
  }

  if (value._id) {
    return value._id.toString();
  }

  return value.toString();
};

const formatProduct = (product) => {
  return {
    id: product.id || product._id?.toString(),
    name: product.name,
    slug: product.slug,
    description: product.description || '',
    shortDescription: product.shortDescription || '',
    metaTitle: product.metaTitle || '',
    metaDescription: product.metaDescription || '',
    categoryId: getDocumentId(product.categoryId),
    basePrice: product.basePrice,
    salePrice: product.salePrice ?? null,
    sku: product.sku,
    hasVariants: Boolean(product.hasVariants),
    images: product.images || [],
    status: product.status,
    isFeatured: Boolean(product.isFeatured),
    tags: product.tags || [],
    attributes: product.attributes || [],
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
};

const getStatusData = () => {
  return {
    module: 'products',
    statuses: productStatuses,
  };
};

const validateProductPricing = ({ basePrice, salePrice }) => {
  if (salePrice !== null && salePrice !== undefined && salePrice > basePrice) {
    throw new ApiError(400, 'salePrice cannot be greater than basePrice');
  }
};

const buildProductPayload = (
  payload = {},
  {
    requireName = false,
    requireCategoryId = false,
    requireBasePrice = false,
    requireSku = false,
  } = {},
) => {
  const productPayload = {};

  for (const field of editableProductFields) {
    if (!hasOwn(payload, field)) {
      continue;
    }

    if (field === 'slug') {
      productPayload.slug = createSlug(payload.slug);
      continue;
    }

    if (field === 'categoryId') {
      productPayload.categoryId = normalizeRequiredObjectId(payload.categoryId, 'categoryId');
      continue;
    }

    if (field === 'basePrice') {
      productPayload.basePrice = normalizeMoney(payload.basePrice, 'basePrice', { required: true });
      continue;
    }

    if (field === 'salePrice') {
      productPayload.salePrice = normalizeMoney(payload.salePrice, 'salePrice');
      continue;
    }

    if (field === 'hasVariants' || field === 'isFeatured') {
      productPayload[field] = normalizeBoolean(payload[field], field);
      continue;
    }

    if (field === 'images') {
      productPayload.images = normalizeStringArray(payload.images, 'images');
      continue;
    }

    if (field === 'status') {
      productPayload.status = normalizeStatus(payload.status);
      continue;
    }

    if (field === 'tags') {
      productPayload.tags = normalizeStringArray(payload.tags, 'tags', {
        lowercase: true,
        splitString: true,
      });
      continue;
    }

    if (field === 'attributes') {
      productPayload.attributes = normalizeAttributes(payload.attributes);
      continue;
    }

    if (field === 'sku') {
      productPayload.sku = normalizeText(payload.sku).toUpperCase();
      continue;
    }

    productPayload[field] = normalizeText(payload[field]);
  }

  if (requireName && !productPayload.name) {
    throw new ApiError(400, 'name is required');
  }

  if (hasOwn(productPayload, 'name') && !productPayload.name) {
    throw new ApiError(400, 'name cannot be empty');
  }

  if (!productPayload.slug && productPayload.name) {
    productPayload.slug = createSlug(productPayload.name);
  }

  if (hasOwn(productPayload, 'slug') && !productPayload.slug) {
    throw new ApiError(400, 'slug cannot be empty');
  }

  if (requireCategoryId && !hasOwn(productPayload, 'categoryId')) {
    throw new ApiError(400, 'categoryId is required');
  }

  if (requireBasePrice && !hasOwn(productPayload, 'basePrice')) {
    throw new ApiError(400, 'basePrice is required');
  }

  if (requireSku && !productPayload.sku) {
    throw new ApiError(400, 'sku is required');
  }

  if (hasOwn(productPayload, 'sku') && !productPayload.sku) {
    throw new ApiError(400, 'sku cannot be empty');
  }

  return productPayload;
};

const buildListFilter = (query = {}, { includeInactive = false } = {}) => {
  const filter = {};

  if (includeInactive) {
    if (hasOwn(query, 'status')) {
      filter.status = normalizeStatus(query.status);
    }
  } else {
    filter.status = 'active';
  }

  if (hasOwn(query, 'categoryId')) {
    filter.categoryId = normalizeRequiredObjectId(query.categoryId, 'categoryId');
  }

  if (hasOwn(query, 'isFeatured')) {
    filter.isFeatured = normalizeBoolean(query.isFeatured, 'isFeatured');
  }

  if (hasOwn(query, 'hasVariants')) {
    filter.hasVariants = normalizeBoolean(query.hasVariants, 'hasVariants');
  }

  if (hasOwn(query, 'tags')) {
    const tags = normalizeStringArray(query.tags, 'tags', {
      lowercase: true,
      splitString: true,
    });

    if (tags.length > 0) {
      filter.tags = {
        $in: tags,
      };
    }
  }

  const minPrice = hasOwn(query, 'minPrice') ? normalizeMoney(query.minPrice, 'minPrice') : null;
  const maxPrice = hasOwn(query, 'maxPrice') ? normalizeMoney(query.maxPrice, 'maxPrice') : null;

  if (minPrice !== null || maxPrice !== null) {
    filter.basePrice = {};

    if (minPrice !== null) {
      filter.basePrice.$gte = minPrice;
    }

    if (maxPrice !== null) {
      filter.basePrice.$lte = maxPrice;
    }
  }

  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    throw new ApiError(400, 'minPrice cannot be greater than maxPrice');
  }

  const search = normalizeText(query.search);

  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), 'i');

    filter.$or = [
      {
        name: searchRegex,
      },
      {
        slug: searchRegex,
      },
      {
        sku: searchRegex,
      },
      {
        shortDescription: searchRegex,
      },
      {
        metaTitle: searchRegex,
      },
      {
        metaDescription: searchRegex,
      },
      {
        tags: searchRegex,
      },
      {
        'attributes.name': searchRegex,
      },
      {
        'attributes.value': searchRegex,
      },
    ];
  }

  return filter;
};

const buildSort = (query = {}) => {
  const sortBy = normalizeText(query.sortBy) || 'createdAt';

  if (!sortableProductFields.has(sortBy)) {
    throw new ApiError(400, `sortBy must be one of: ${Array.from(sortableProductFields).join(', ')}`);
  }

  const sortOrder = normalizeText(query.sortOrder).toLowerCase() === 'asc' ? 1 : -1;

  if (sortBy === 'createdAt') {
    return {
      createdAt: sortOrder,
    };
  }

  return {
    [sortBy]: sortOrder,
    createdAt: -1,
  };
};

const assertProductSlugIsAvailable = async (slug, excludedProductId = null) => {
  const query = { slug };

  if (excludedProductId) {
    query._id = {
      $ne: excludedProductId,
    };
  }

  const existingProduct = await Product.exists(query).exec();

  if (existingProduct) {
    throw new ApiError(409, 'Product slug already exists');
  }
};

const assertProductSkuIsAvailable = async (sku, excludedProductId = null) => {
  const query = { sku };

  if (excludedProductId) {
    query._id = {
      $ne: excludedProductId,
    };
  }

  const existingProduct = await Product.exists(query).exec();

  if (existingProduct) {
    throw new ApiError(409, 'Product sku already exists');
  }
};

const assertCategoryExists = async (categoryId) => {
  const category = await Category.exists({ _id: categoryId }).exec();

  if (!category) {
    throw new ApiError(400, 'Category not found');
  }
};

const getProductDocument = async (productId) => {
  assertDatabaseReady();
  assertValidProductId(productId);

  const product = await Product.findById(productId).exec();

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  return product;
};

const createProduct = async (payload) => {
  assertDatabaseReady();
  const productPayload = buildProductPayload(payload, {
    requireBasePrice: true,
    requireCategoryId: true,
    requireName: true,
    requireSku: true,
  });

  validateProductPricing(productPayload);
  await assertCategoryExists(productPayload.categoryId);
  await assertProductSlugIsAvailable(productPayload.slug);
  await assertProductSkuIsAvailable(productPayload.sku);

  try {
    const product = await Product.create(productPayload);

    return formatProduct(product);
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateField = error.keyPattern?.sku ? 'sku' : 'slug';
      throw new ApiError(409, `Product ${duplicateField} already exists`);
    }

    throw error;
  }
};

const listProducts = async (query = {}, options = {}) => {
  assertDatabaseReady();
  const { limit, page, skip } = getPagination(query);
  const filter = buildListFilter(query, options);
  const sort = buildSort(query);
  const [products, total] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(limit).lean().exec(),
    Product.countDocuments(filter).exec(),
  ]);

  return {
    items: products.map(formatProduct),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
};

const getProduct = async (productIdOrSlug, options = {}) => {
  assertDatabaseReady();
  const identifier = normalizeText(productIdOrSlug);

  if (!identifier) {
    throw new ApiError(400, 'Product id or slug is required');
  }

  const filter = mongoose.Types.ObjectId.isValid(identifier)
    ? { _id: identifier }
    : { slug: createSlug(identifier) };

  if (!options.includeInactive) {
    filter.status = 'active';
  }

  const product = await Product.findOne(filter).lean().exec();

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  return formatProduct(product);
};

const updateProduct = async (productId, payload) => {
  const product = await getProductDocument(productId);
  const productPayload = buildProductPayload(payload);

  if (Object.keys(productPayload).length === 0) {
    throw new ApiError(400, 'No product fields provided to update');
  }

  if (hasOwn(productPayload, 'slug')) {
    await assertProductSlugIsAvailable(productPayload.slug, product._id);
  }

  if (hasOwn(productPayload, 'sku')) {
    await assertProductSkuIsAvailable(productPayload.sku, product._id);
  }

  if (hasOwn(productPayload, 'categoryId')) {
    await assertCategoryExists(productPayload.categoryId);
  }

  validateProductPricing({
    basePrice: hasOwn(productPayload, 'basePrice') ? productPayload.basePrice : product.basePrice,
    salePrice: hasOwn(productPayload, 'salePrice') ? productPayload.salePrice : product.salePrice,
  });

  Object.assign(product, productPayload);

  try {
    await product.save();
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateField = error.keyPattern?.sku ? 'sku' : 'slug';
      throw new ApiError(409, `Product ${duplicateField} already exists`);
    }

    throw error;
  }

  return formatProduct(product);
};

const deleteProduct = async (productId) => {
  const product = await getProductDocument(productId);
  const deletedProduct = formatProduct(product);

  await product.deleteOne();

  return deletedProduct;
};

export {
  createProduct,
  deleteProduct,
  formatProduct,
  getProduct,
  getStatusData,
  listProducts,
  updateProduct,
};

export default {
  createProduct,
  deleteProduct,
  formatProduct,
  getProduct,
  getStatusData,
  listProducts,
  updateProduct,
};
