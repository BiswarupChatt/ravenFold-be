import ApiError from '@/common/errors/api.error.js';
import { getPagination } from '@/common/utils/pagination.util.js';
import {
  assertDatabaseReady,
  assertValidObjectId,
  escapeRegex,
  getDocumentId,
  hasOwn,
  isValidObjectId,
  normalizeBoolean,
  normalizeMoney,
  normalizeOptionalNumber,
  normalizeRequiredObjectId,
  normalizeStringArray,
  normalizeText,
} from '@/common/utils/service.util.js';
import { createSlug } from '@/common/utils/slug.util.js';
import Category from '@/modules/category/models/category.model.js';
import ProductOptionValue from '@/modules/product/models/product-option-value.model.js';
import ProductOption from '@/modules/product/models/product-option.model.js';
import ProductVariant from '@/modules/product/models/product-variant.model.js';
import Product, { dimensionUnits, productStatuses, weightUnits } from '@/modules/product/models/product.model.js';

const editableProductFields = [
  'name',
  'slug',
  'description',
  'shortDescription',
  'metaTitle',
  'metaDescription',
  'seo',
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
  'shipping',
];

const sortableProductFields = new Set(['name', 'createdAt', 'updatedAt', 'basePrice', 'salePrice']);

const assertValidProductId = (productId) => {
  assertValidObjectId(productId, 'product id');
};

const normalizeStatus = (value) => {
  const normalizedValue = normalizeText(value).toLowerCase();

  if (!productStatuses.includes(normalizedValue)) {
    throw new ApiError(400, `status must be one of: ${productStatuses.join(', ')}`);
  }

  return normalizedValue;
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

const normalizeShipping = (value = {}) => {
  if (value === null || value === undefined || value === '') {
    return {};
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'shipping must be an object');
  }

  const shipping = {};

  if (hasOwn(value, 'requiresShipping')) {
    shipping.requiresShipping = normalizeBoolean(value.requiresShipping, 'shipping.requiresShipping');
  }

  if (hasOwn(value, 'shippingClass')) {
    shipping.shippingClass = normalizeText(value.shippingClass);
  }

  if (hasOwn(value, 'isFreeShippingEligible')) {
    shipping.isFreeShippingEligible = normalizeBoolean(
      value.isFreeShippingEligible,
      'shipping.isFreeShippingEligible',
    );
  }

  if (hasOwn(value, 'weight')) {
    if (value.weight === null || typeof value.weight !== 'object' || Array.isArray(value.weight)) {
      throw new ApiError(400, 'shipping.weight must be an object');
    }

    shipping.weight = {};

    if (hasOwn(value.weight, 'value')) {
      shipping.weight.value = normalizeOptionalNumber(value.weight.value, 'shipping.weight.value');
    }

    if (hasOwn(value.weight, 'unit')) {
      const unit = normalizeText(value.weight.unit).toLowerCase();

      if (!weightUnits.includes(unit)) {
        throw new ApiError(400, `shipping.weight.unit must be one of: ${weightUnits.join(', ')}`);
      }

      shipping.weight.unit = unit;
    }
  }

  if (hasOwn(value, 'dimensions')) {
    if (value.dimensions === null || typeof value.dimensions !== 'object' || Array.isArray(value.dimensions)) {
      throw new ApiError(400, 'shipping.dimensions must be an object');
    }

    shipping.dimensions = {};

    for (const field of ['length', 'width', 'height']) {
      if (hasOwn(value.dimensions, field)) {
        shipping.dimensions[field] = normalizeOptionalNumber(
          value.dimensions[field],
          `shipping.dimensions.${field}`,
        );
      }
    }

    if (hasOwn(value.dimensions, 'unit')) {
      const unit = normalizeText(value.dimensions.unit).toLowerCase();

      if (!dimensionUnits.includes(unit)) {
        throw new ApiError(400, `shipping.dimensions.unit must be one of: ${dimensionUnits.join(', ')}`);
      }

      shipping.dimensions.unit = unit;
    }
  }

  return shipping;
};

const mergeShipping = (currentShipping = {}, nextShipping = {}) => ({
  requiresShipping: hasOwn(nextShipping, 'requiresShipping')
    ? nextShipping.requiresShipping
    : currentShipping.requiresShipping !== false,
  weight: {
    value: hasOwn(nextShipping.weight || {}, 'value')
      ? nextShipping.weight.value
      : currentShipping.weight?.value ?? null,
    unit: nextShipping.weight?.unit || currentShipping.weight?.unit || 'kg',
  },
  dimensions: {
    length: hasOwn(nextShipping.dimensions || {}, 'length')
      ? nextShipping.dimensions.length
      : currentShipping.dimensions?.length ?? null,
    width: hasOwn(nextShipping.dimensions || {}, 'width')
      ? nextShipping.dimensions.width
      : currentShipping.dimensions?.width ?? null,
    height: hasOwn(nextShipping.dimensions || {}, 'height')
      ? nextShipping.dimensions.height
      : currentShipping.dimensions?.height ?? null,
    unit: nextShipping.dimensions?.unit || currentShipping.dimensions?.unit || 'cm',
  },
  shippingClass: hasOwn(nextShipping, 'shippingClass')
    ? nextShipping.shippingClass
    : currentShipping.shippingClass || '',
  isFreeShippingEligible: hasOwn(nextShipping, 'isFreeShippingEligible')
    ? nextShipping.isFreeShippingEligible
    : Boolean(currentShipping.isFreeShippingEligible),
});

const normalizeSeo = (value = {}) => {
  if (value === null || value === undefined || value === '') {
    return {};
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'seo must be an object');
  }

  const seo = {};

  if (hasOwn(value, 'title')) {
    seo.title = normalizeText(value.title);
  }

  if (hasOwn(value, 'description')) {
    seo.description = normalizeText(value.description);
  }

  if (hasOwn(value, 'keywords')) {
    seo.keywords = normalizeStringArray(value.keywords, 'seo.keywords', {
      lowercase: true,
      splitString: true,
    });
  }

  if (hasOwn(value, 'canonicalUrl')) {
    seo.canonicalUrl = normalizeText(value.canonicalUrl);
  }

  if (hasOwn(value, 'noIndex')) {
    seo.noIndex = normalizeBoolean(value.noIndex, 'seo.noIndex');
  }

  return seo;
};

const mergeSeo = (currentSeo = {}, nextSeo = {}) => ({
  title: hasOwn(nextSeo, 'title') ? nextSeo.title : currentSeo.title || '',
  description: hasOwn(nextSeo, 'description') ? nextSeo.description : currentSeo.description || '',
  keywords: hasOwn(nextSeo, 'keywords') ? nextSeo.keywords : currentSeo.keywords || [],
  canonicalUrl: hasOwn(nextSeo, 'canonicalUrl') ? nextSeo.canonicalUrl : currentSeo.canonicalUrl || '',
  noIndex: hasOwn(nextSeo, 'noIndex') ? nextSeo.noIndex : Boolean(currentSeo.noIndex),
});

const formatCategorySummary = (category) => {
  if (!category || typeof category !== 'object' || !category._id || !category.name) {
    return null;
  }

  return {
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
  };
};

const formatShipping = (shipping = {}) => ({
  requiresShipping: shipping.requiresShipping !== false,
  weight: {
    value: shipping.weight?.value ?? null,
    unit: shipping.weight?.unit || 'kg',
  },
  dimensions: {
    length: shipping.dimensions?.length ?? null,
    width: shipping.dimensions?.width ?? null,
    height: shipping.dimensions?.height ?? null,
    unit: shipping.dimensions?.unit || 'cm',
  },
  shippingClass: shipping.shippingClass || '',
  isFreeShippingEligible: Boolean(shipping.isFreeShippingEligible),
});

const formatSeo = (seo = {}, product = {}) => ({
  title: seo.title || product.metaTitle || '',
  description: seo.description || product.metaDescription || '',
  keywords: seo.keywords || [],
  canonicalUrl: seo.canonicalUrl || '',
  noIndex: Boolean(seo.noIndex),
});

const formatProductOptionValue = (optionValue = {}) => ({
  id: optionValue.id || optionValue._id?.toString(),
  productOptionId: optionValue.productOptionId?.toString(),
  value: optionValue.value,
  label: optionValue.label || optionValue.value,
  colorHex: optionValue.colorHex || '',
  sortOrder: optionValue.sortOrder || 0,
});

const formatProductOption = (option = {}, values = []) => ({
  id: option.id || option._id?.toString(),
  productId: option.productId?.toString(),
  name: option.name,
  optionType: option.optionType || 'other',
  displayStyle: option.displayStyle || (option.optionType === 'color' ? 'swatch' : 'button'),
  sizeGuideImageUrl: option.sizeGuideImageUrl || '',
  sortOrder: option.sortOrder || 0,
  values: values.map(formatProductOptionValue),
});

const getProductOptions = async (productId) => {
  const options = await ProductOption.find({ productId })
    .sort({ sortOrder: 1, name: 1, createdAt: 1 })
    .lean()
    .exec();
  const optionIds = options.map((option) => option._id);
  const values = await ProductOptionValue.find({
    productOptionId: {
      $in: optionIds,
    },
  })
    .sort({ sortOrder: 1, value: 1, createdAt: 1 })
    .lean()
    .exec();
  const valuesByOptionId = new Map();

  for (const value of values) {
    const optionId = value.productOptionId.toString();
    const optionValues = valuesByOptionId.get(optionId) || [];

    optionValues.push(value);
    valuesByOptionId.set(optionId, optionValues);
  }

  return options.map((option) => formatProductOption(
    option,
    valuesByOptionId.get(option._id.toString()) || [],
  ));
};

const formatProduct = (product) => {
  const seo = formatSeo(product.seo || {}, product);

  return {
    id: product.id || product._id?.toString(),
    name: product.name,
    slug: product.slug,
    description: product.description || '',
    shortDescription: product.shortDescription || '',
    metaTitle: seo.title,
    metaDescription: seo.description,
    seo,
    categoryId: getDocumentId(product.categoryId),
    category: formatCategorySummary(product.categoryId),
    categoryName: product.categoryId?.name || '',
    basePrice: product.basePrice,
    salePrice: product.salePrice ?? null,
    sku: product.sku,
    hasVariants: Boolean(product.hasVariants),
    images: product.images || [],
    status: product.status,
    isFeatured: Boolean(product.isFeatured),
    tags: product.tags || [],
    attributes: product.attributes || [],
    options: product.options || [],
    shipping: formatShipping(product.shipping || {}),
    averageRating: Number(product.averageRating || 0),
    reviewCount: Number(product.reviewCount || 0),
    ratingDistribution: product.ratingDistribution || {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    },
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
    currentProduct = null,
    requireName = false,
    requireCategoryId = false,
    requireBasePrice = false,
    requireSku = false,
  } = {},
) => {
  const productPayload = {};
  let seoPatch = null;
  let shippingPatch = null;

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

    if (field === 'metaTitle') {
      productPayload.metaTitle = normalizeText(payload.metaTitle);
      seoPatch = {
        ...(seoPatch || {}),
        title: productPayload.metaTitle,
      };
      continue;
    }

    if (field === 'metaDescription') {
      productPayload.metaDescription = normalizeText(payload.metaDescription);
      seoPatch = {
        ...(seoPatch || {}),
        description: productPayload.metaDescription,
      };
      continue;
    }

    if (field === 'seo') {
      seoPatch = {
        ...(seoPatch || {}),
        ...normalizeSeo(payload.seo),
      };
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

    if (field === 'shipping') {
      shippingPatch = {
        ...(shippingPatch || {}),
        ...normalizeShipping(payload.shipping),
      };
      continue;
    }

    if (field === 'sku') {
      productPayload.sku = normalizeText(payload.sku).toUpperCase();
      continue;
    }

    productPayload[field] = normalizeText(payload[field]);
  }

  if (seoPatch) {
    productPayload.seo = mergeSeo(currentProduct ? formatSeo(currentProduct.seo || {}, currentProduct) : {}, seoPatch);
    productPayload.metaTitle = productPayload.seo.title;
    productPayload.metaDescription = productPayload.seo.description;
  }

  if (shippingPatch) {
    productPayload.shipping = mergeShipping(currentProduct?.shipping || {}, shippingPatch);
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
        'seo.title': searchRegex,
      },
      {
        'seo.description': searchRegex,
      },
      {
        'seo.keywords': searchRegex,
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
    Product.find(filter)
      .populate({ path: 'categoryId', select: 'name slug' })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
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

  const filter = isValidObjectId(identifier)
    ? { _id: identifier }
    : { slug: createSlug(identifier) };

  if (!options.includeInactive) {
    filter.status = 'active';
  }

  const product = await Product.findOne(filter)
    .populate({ path: 'categoryId', select: 'name slug' })
    .lean()
    .exec();

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  return {
    ...formatProduct(product),
    options: await getProductOptions(product._id),
  };
};

const updateProduct = async (productId, payload) => {
  const product = await getProductDocument(productId);
  const productPayload = buildProductPayload(payload, { currentProduct: product });

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
  const productOptions = await ProductOption.find({ productId: product._id }).select('_id').lean().exec();
  const productOptionIds = productOptions.map((option) => option._id);

  await ProductVariant.deleteMany({ productId: product._id }).exec();
  await ProductOptionValue.deleteMany({
    productOptionId: {
      $in: productOptionIds,
    },
  }).exec();
  await ProductOption.deleteMany({ productId: product._id }).exec();
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
