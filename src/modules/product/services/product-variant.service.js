import ApiError from '@/common/errors/api.error.js';
import { getPagination } from '@/common/utils/pagination.util.js';
import {
  assertDatabaseReady,
  assertValidObjectId,
  escapeRegex,
  hasOwn,
  normalizeBoolean,
  normalizeMoney,
  normalizeOptionalNumber,
  normalizeStringArray,
  normalizeText,
} from '@/common/utils/service.util.js';
import ProductOptionValue from '@/modules/product/models/product-option-value.model.js';
import ProductOption from '@/modules/product/models/product-option.model.js';
import ProductVariant, { dimensionUnits, weightUnits } from '@/modules/product/models/product-variant.model.js';
import Product from '@/modules/product/models/product.model.js';

const editableVariantFields = [
  'sku',
  'optionValues',
  'price',
  'salePrice',
  'images',
  'shipping',
  'isActive',
];

const assertProductExists = async (productId) => {
  assertValidObjectId(productId, 'product id');

  const product = await Product.exists({ _id: productId }).exec();

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
};

const getVariantDocument = async (productId, variantId) => {
  assertValidObjectId(productId, 'product id');
  assertValidObjectId(variantId, 'product variant id');

  const variant = await ProductVariant.findOne({ _id: variantId, productId }).exec();

  if (!variant) {
    throw new ApiError(404, 'Product variant not found');
  }

  return variant;
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

const formatProductVariant = (variant) => ({
  id: variant.id || variant._id?.toString(),
  productId: variant.productId?.toString(),
  sku: variant.sku,
  optionValues: (variant.optionValues || []).map((optionValue) => ({
    optionId: optionValue.optionId?.toString() || '',
    valueId: optionValue.valueId?.toString() || '',
    optionName: optionValue.optionName,
    value: optionValue.value,
  })),
  price: variant.price,
  salePrice: variant.salePrice ?? null,
  images: variant.images || [],
  shipping: formatShipping(variant.shipping || {}),
  isActive: Boolean(variant.isActive),
  createdAt: variant.createdAt,
  updatedAt: variant.updatedAt,
});

const buildOptionSignature = (optionValues = []) => {
  return optionValues
    .map((optionValue) => {
      const optionKey = optionValue.optionId?.toString() || optionValue.optionName.toLowerCase();
      const valueKey = optionValue.valueId?.toString() || optionValue.value.toLowerCase();

      return `${optionKey}:${valueKey}`;
    })
    .sort()
    .join('|');
};

const normalizeVariantOptionValues = async (productId, value) => {
  if (!Array.isArray(value)) {
    throw new ApiError(400, 'optionValues must be an array');
  }

  if (value.length === 0) {
    throw new ApiError(400, 'optionValues must include at least one option');
  }

  const options = await ProductOption.find({ productId }).lean().exec();
  const optionIds = options.map((option) => option._id);
  const optionById = new Map(options.map((option) => [option._id.toString(), option]));
  const optionByName = new Map(options.map((option) => [option.name.toLowerCase(), option]));
  const values = await ProductOptionValue.find({
    productOptionId: {
      $in: optionIds,
    },
  }).lean().exec();
  const valueById = new Map(values.map((optionValue) => [optionValue._id.toString(), optionValue]));
  const valueByOptionAndName = new Map(
    values.map((optionValue) => [
      `${optionValue.productOptionId.toString()}:${optionValue.value.toLowerCase()}`,
      optionValue,
    ]),
  );
  const seenOptionIds = new Set();
  const normalizedOptionValues = [];

  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new ApiError(400, 'optionValues must be an array of optionName/value pairs');
    }

    const optionId = normalizeText(item.optionId);
    const valueId = normalizeText(item.valueId);
    const optionName = normalizeText(item.optionName);
    const optionValue = normalizeText(item.value);

    if ((!optionId && !optionName) || (!valueId && !optionValue)) {
      throw new ApiError(400, 'optionValues must include optionId/valueId or optionName/value');
    }

    const optionNameKey = optionName.toLowerCase();
    const productOption = optionId
      ? optionById.get(optionId)
      : optionByName.get(optionNameKey);

    if (!productOption) {
      throw new ApiError(400, `Product option "${optionName || optionId}" does not exist`);
    }

    const productOptionId = productOption._id.toString();

    if (seenOptionIds.has(productOptionId)) {
      throw new ApiError(400, 'Each option can be used only once per variant');
    }

    let productOptionValue = valueId
      ? valueById.get(valueId)
      : valueByOptionAndName.get(`${productOptionId}:${optionValue.toLowerCase()}`);

    if (productOptionValue && productOptionValue.productOptionId.toString() !== productOptionId) {
      productOptionValue = null;
    }

    if (!productOptionValue) {
      throw new ApiError(400, `Product option value "${optionValue}" does not exist for "${productOption.name}"`);
    }

    if (optionValue && optionValue.toLowerCase() !== productOptionValue.value.toLowerCase()) {
      const matchingOptionValue = await ProductOptionValue.findOne({
        productOptionId: productOption._id,
        value: new RegExp(`^${escapeRegex(optionValue)}$`, 'i'),
      }).lean().exec();

      if (!matchingOptionValue || matchingOptionValue._id.toString() !== productOptionValue._id.toString()) {
        throw new ApiError(400, `Product option value "${optionValue}" does not match valueId`);
      }
    }

    seenOptionIds.add(productOptionId);
    normalizedOptionValues.push({
      optionId: productOption._id,
      valueId: productOptionValue._id,
      optionName: productOption.name,
      value: productOptionValue.value,
    });
  }

  return normalizedOptionValues;
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

const buildVariantPayload = async (
  productId,
  payload = {},
  {
    currentVariant = null,
    requireOptionValues = false,
    requirePrice = false,
    requireSku = false,
  } = {},
) => {
  const variantPayload = {};

  for (const field of editableVariantFields) {
    if (!hasOwn(payload, field)) {
      continue;
    }

    if (field === 'sku') {
      variantPayload.sku = normalizeText(payload.sku).toUpperCase();
      continue;
    }

    if (field === 'optionValues') {
      variantPayload.optionValues = await normalizeVariantOptionValues(productId, payload.optionValues);
      variantPayload.optionSignature = buildOptionSignature(variantPayload.optionValues);
      continue;
    }

    if (field === 'price') {
      variantPayload.price = normalizeMoney(payload.price, 'price', { required: true });
      continue;
    }

    if (field === 'salePrice') {
      variantPayload.salePrice = normalizeMoney(payload.salePrice, 'salePrice');
      continue;
    }

    if (field === 'images') {
      variantPayload.images = normalizeStringArray(payload.images, 'images');
      continue;
    }

    if (field === 'shipping') {
      variantPayload.shipping = currentVariant
        ? mergeShipping(currentVariant.shipping || {}, normalizeShipping(payload.shipping))
        : mergeShipping({}, normalizeShipping(payload.shipping));
      continue;
    }

    if (field === 'isActive') {
      variantPayload.isActive = normalizeBoolean(payload.isActive, 'isActive');
    }
  }

  if (requireSku && !variantPayload.sku) {
    throw new ApiError(400, 'sku is required');
  }

  if (hasOwn(variantPayload, 'sku') && !variantPayload.sku) {
    throw new ApiError(400, 'sku cannot be empty');
  }

  if (requireOptionValues && !hasOwn(variantPayload, 'optionValues')) {
    throw new ApiError(400, 'optionValues is required');
  }

  if (requirePrice && !hasOwn(variantPayload, 'price')) {
    throw new ApiError(400, 'price is required');
  }

  return variantPayload;
};

const validateVariantPricing = ({ price, salePrice }) => {
  if (salePrice !== null && salePrice !== undefined && salePrice > price) {
    throw new ApiError(400, 'salePrice cannot be greater than price');
  }
};

const buildListFilter = (productId, query = {}, { includeInactive = false } = {}) => {
  const filter = { productId };

  if (includeInactive) {
    if (hasOwn(query, 'isActive')) {
      filter.isActive = normalizeBoolean(query.isActive, 'isActive');
    }
  } else {
    filter.isActive = true;
  }

  return filter;
};

const createProductVariant = async (productId, payload) => {
  assertDatabaseReady();
  await assertProductExists(productId);

  const variantPayload = await buildVariantPayload(productId, payload, {
    requireOptionValues: true,
    requirePrice: true,
    requireSku: true,
  });

  validateVariantPricing(variantPayload);

  try {
    const variant = await ProductVariant.create({
      ...variantPayload,
      productId,
    });

    await Product.updateOne({ _id: productId }, { hasVariants: true }).exec();

    return formatProductVariant(variant);
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateField = error.keyPattern?.sku ? 'sku' : 'option values';
      throw new ApiError(409, `Product variant ${duplicateField} already exists`);
    }

    throw error;
  }
};

const listProductVariants = async (productId, query = {}, options = {}) => {
  assertDatabaseReady();
  await assertProductExists(productId);

  const { limit, page, skip } = getPagination(query);
  const filter = buildListFilter(productId, query, options);
  const [variants, total] = await Promise.all([
    ProductVariant.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
    ProductVariant.countDocuments(filter).exec(),
  ]);

  return {
    items: variants.map(formatProductVariant),
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

const getProductVariant = async (productId, variantId, options = {}) => {
  assertDatabaseReady();
  const variant = await getVariantDocument(productId, variantId);

  if (!options.includeInactive && !variant.isActive) {
    throw new ApiError(404, 'Product variant not found');
  }

  return formatProductVariant(variant);
};

const updateProductVariant = async (productId, variantId, payload) => {
  assertDatabaseReady();
  const variant = await getVariantDocument(productId, variantId);
  const variantPayload = await buildVariantPayload(productId, payload, { currentVariant: variant });

  if (Object.keys(variantPayload).length === 0) {
    throw new ApiError(400, 'No product variant fields provided to update');
  }

  validateVariantPricing({
    price: hasOwn(variantPayload, 'price') ? variantPayload.price : variant.price,
    salePrice: hasOwn(variantPayload, 'salePrice') ? variantPayload.salePrice : variant.salePrice,
  });

  Object.assign(variant, variantPayload);

  try {
    await variant.save();
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateField = error.keyPattern?.sku ? 'sku' : 'option values';
      throw new ApiError(409, `Product variant ${duplicateField} already exists`);
    }

    throw error;
  }

  return formatProductVariant(variant);
};

const deleteProductVariant = async (productId, variantId) => {
  assertDatabaseReady();
  const variant = await getVariantDocument(productId, variantId);
  const deletedVariant = formatProductVariant(variant);

  await variant.deleteOne();

  return deletedVariant;
};

export {
  createProductVariant,
  deleteProductVariant,
  formatProductVariant,
  getProductVariant,
  listProductVariants,
  updateProductVariant,
};

export default {
  createProductVariant,
  deleteProductVariant,
  formatProductVariant,
  getProductVariant,
  listProductVariants,
  updateProductVariant,
};
