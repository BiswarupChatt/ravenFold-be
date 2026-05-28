import ApiError from '@/common/errors/api.error.js';
import {
  assertDatabaseReady,
  assertValidObjectId,
  escapeRegex,
  hasOwn,
  normalizeText,
} from '@/common/utils/service.util.js';
import ProductOptionValue from '@/modules/product/models/product-option-value.model.js';
import ProductOption, {
  productOptionDisplayStyles,
  productOptionTypes,
} from '@/modules/product/models/product-option.model.js';
import ProductVariant from '@/modules/product/models/product-variant.model.js';
import Product from '@/modules/product/models/product.model.js';

const normalizeOptionType = (value) => {
  const normalizedValue = normalizeText(value).toLowerCase();

  if (!normalizedValue) {
    return 'other';
  }

  if (!productOptionTypes.includes(normalizedValue)) {
    throw new ApiError(400, `optionType must be one of: ${productOptionTypes.join(', ')}`);
  }

  return normalizedValue;
};

const normalizeDisplayStyle = (value, optionType = 'other') => {
  const normalizedValue = normalizeText(value).toLowerCase();

  if (!normalizedValue) {
    return optionType === 'color' ? 'swatch' : 'button';
  }

  if (!productOptionDisplayStyles.includes(normalizedValue)) {
    throw new ApiError(400, `displayStyle must be one of: ${productOptionDisplayStyles.join(', ')}`);
  }

  return normalizedValue;
};

const normalizeOptionalUrl = (value, field) => {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return '';
  }

  try {
    const parsedUrl = new URL(normalizedValue);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch {
    throw new ApiError(400, `${field} must be a valid http or https URL`);
  }

  return normalizedValue;
};

const normalizeColorHex = (value) => {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return '';
  }

  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalizedValue)) {
    throw new ApiError(400, 'colorHex must be a valid hex color, for example #1e2952');
  }

  return normalizedValue.toUpperCase();
};

const normalizeSortOrder = (value, field = 'sortOrder') => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new ApiError(400, `${field} must be a non-negative integer`);
  }

  return numberValue;
};

const assertProductExists = async (productId) => {
  assertValidObjectId(productId, 'product id');

  const product = await Product.exists({ _id: productId }).exec();

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
};

const formatOptionValue = (optionValue) => ({
  id: optionValue.id || optionValue._id?.toString(),
  productOptionId: optionValue.productOptionId?.toString(),
  value: optionValue.value,
  label: optionValue.label || optionValue.value,
  colorHex: optionValue.colorHex || '',
  sortOrder: optionValue.sortOrder || 0,
  createdAt: optionValue.createdAt,
  updatedAt: optionValue.updatedAt,
});

const formatProductOption = (option, values = []) => ({
  id: option.id || option._id?.toString(),
  productId: option.productId?.toString(),
  name: option.name,
  optionType: option.optionType || 'other',
  displayStyle: option.displayStyle || (option.optionType === 'color' ? 'swatch' : 'button'),
  sizeGuideImageUrl: option.sizeGuideImageUrl || '',
  sortOrder: option.sortOrder || 0,
  values: values.map(formatOptionValue),
  createdAt: option.createdAt,
  updatedAt: option.updatedAt,
});

const normalizeOptionPayload = (payload = {}, { requireName = false } = {}) => {
  const optionPayload = {};

  if (hasOwn(payload, 'name')) {
    optionPayload.name = normalizeText(payload.name);
  }

  if (hasOwn(payload, 'optionType')) {
    optionPayload.optionType = normalizeOptionType(payload.optionType);
  }

  const effectiveOptionType = optionPayload.optionType || normalizeOptionType(payload.optionType);

  if (hasOwn(payload, 'displayStyle')) {
    optionPayload.displayStyle = normalizeDisplayStyle(payload.displayStyle, effectiveOptionType);
  }

  if (hasOwn(payload, 'optionType') && !hasOwn(payload, 'displayStyle')) {
    optionPayload.displayStyle = normalizeDisplayStyle('', optionPayload.optionType);
  }

  if (hasOwn(payload, 'sizeGuideImageUrl')) {
    optionPayload.sizeGuideImageUrl = normalizeOptionalUrl(payload.sizeGuideImageUrl, 'sizeGuideImageUrl');
  }

  if (hasOwn(payload, 'sortOrder')) {
    optionPayload.sortOrder = normalizeSortOrder(payload.sortOrder);
  }

  if (requireName && !optionPayload.name) {
    throw new ApiError(400, 'name is required');
  }

  if (hasOwn(optionPayload, 'name') && !optionPayload.name) {
    throw new ApiError(400, 'name cannot be empty');
  }

  return optionPayload;
};

const buildProductOptionPayload = normalizeOptionPayload;

const normalizeOptionValuePayload = (payload = {}, { requireValue = false } = {}) => {
  const optionValuePayload = {};

  if (hasOwn(payload, 'value')) {
    optionValuePayload.value = normalizeText(payload.value);
  }

  if (hasOwn(payload, 'label')) {
    optionValuePayload.label = normalizeText(payload.label);
  }

  if (hasOwn(payload, 'colorHex')) {
    optionValuePayload.colorHex = normalizeColorHex(payload.colorHex);
  }

  if (hasOwn(payload, 'sortOrder')) {
    optionValuePayload.sortOrder = normalizeSortOrder(payload.sortOrder, 'value sortOrder');
  }

  if (requireValue && !optionValuePayload.value) {
    throw new ApiError(400, 'value is required');
  }

  if (hasOwn(optionValuePayload, 'value') && !optionValuePayload.value) {
    throw new ApiError(400, 'value cannot be empty');
  }

  if (!optionValuePayload.label && optionValuePayload.value) {
    optionValuePayload.label = optionValuePayload.value;
  }

  return optionValuePayload;
};

const normalizeValues = (values = []) => {
  if (values === null || values === undefined || values === '') {
    return [];
  }

  const rawValues = Array.isArray(values) ? values : [values];
  const normalizedValues = rawValues
    .map((value) => (
      typeof value === 'object'
        ? normalizeOptionValuePayload(value, { requireValue: true })
        : normalizeOptionValuePayload({ value }, { requireValue: true })
    ))
    .filter((value) => value.value);
  const seenValues = new Set();

  return normalizedValues.filter((valuePayload) => {
    const valueKey = valuePayload.value.toLowerCase();

    if (seenValues.has(valueKey)) {
      return false;
    }

    seenValues.add(valueKey);
    return true;
  });
};

const assertOptionNameAvailable = async (productId, name, excludedOptionId = null) => {
  const query = {
    productId,
    name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
  };

  if (excludedOptionId) {
    query._id = {
      $ne: excludedOptionId,
    };
  }

  const existingOption = await ProductOption.exists(query).exec();

  if (existingOption) {
    throw new ApiError(409, 'Product option name already exists');
  }
};

const assertOptionValueAvailable = async (productOptionId, value, excludedValueId = null) => {
  const query = {
    productOptionId,
    value: new RegExp(`^${escapeRegex(value)}$`, 'i'),
  };

  if (excludedValueId) {
    query._id = {
      $ne: excludedValueId,
    };
  }

  const existingOptionValue = await ProductOptionValue.exists(query).exec();

  if (existingOptionValue) {
    throw new ApiError(409, 'Product option value already exists');
  }
};

const getOptionDocument = async (productId, optionId) => {
  assertValidObjectId(productId, 'product id');
  assertValidObjectId(optionId, 'product option id');

  const option = await ProductOption.findOne({ _id: optionId, productId }).exec();

  if (!option) {
    throw new ApiError(404, 'Product option not found');
  }

  return option;
};

const getOptionValueDocument = async (productId, optionId, valueId) => {
  assertValidObjectId(valueId, 'product option value id');
  const option = await getOptionDocument(productId, optionId);
  const optionValue = await ProductOptionValue.findOne({
    _id: valueId,
    productOptionId: option._id,
  }).exec();

  if (!optionValue) {
    throw new ApiError(404, 'Product option value not found');
  }

  return {
    option,
    optionValue,
  };
};

const getValuesByOptionIds = async (optionIds = []) => {
  const values = await ProductOptionValue.find({
    productOptionId: {
      $in: optionIds,
    },
  }).sort({ sortOrder: 1, value: 1, createdAt: 1 }).lean().exec();
  const valuesByOptionId = new Map();

  for (const value of values) {
    const optionId = value.productOptionId.toString();
    const optionValues = valuesByOptionId.get(optionId) || [];

    optionValues.push(value);
    valuesByOptionId.set(optionId, optionValues);
  }

  return valuesByOptionId;
};

const assertOptionIsNotUsedByVariants = async (productId, option) => {
  const variantUsingOption = await ProductVariant.exists({
    productId,
    $or: [
      { 'optionValues.optionName': option.name },
      { 'optionValues.optionId': option._id },
    ],
  }).exec();

  if (variantUsingOption) {
    throw new ApiError(409, 'Cannot change or delete an option that is used by variants');
  }
};

const assertOptionValueIsNotUsedByVariants = async (productId, option, optionValue) => {
  const variantUsingOptionValue = await ProductVariant.exists({
    productId,
    $or: [
      {
        optionValues: {
          $elemMatch: {
            optionName: option.name,
            value: optionValue.value,
          },
        },
      },
      {
        optionValues: {
          $elemMatch: {
            optionId: option._id,
            valueId: optionValue._id,
          },
        },
      },
    ],
  }).exec();

  if (variantUsingOptionValue) {
    throw new ApiError(409, 'Cannot change or delete an option value that is used by variants');
  }
};

const createProductOption = async (productId, payload) => {
  assertDatabaseReady();
  await assertProductExists(productId);

  const optionPayload = buildProductOptionPayload(payload, { requireName: true });

  await assertOptionNameAvailable(productId, optionPayload.name);

  let option;

  try {
    option = await ProductOption.create({
      ...optionPayload,
      productId,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'Product option name already exists');
    }

    throw error;
  }

  const values = [];

  for (const valuePayload of normalizeValues(payload.values)) {
    await assertOptionValueAvailable(option._id, valuePayload.value);

    try {
      values.push(await ProductOptionValue.create({
        productOptionId: option._id,
        ...valuePayload,
      }));
    } catch (error) {
      if (error?.code === 11000) {
        throw new ApiError(409, 'Product option value already exists');
      }

      throw error;
    }
  }

  return formatProductOption(option, values);
};

const listProductOptions = async (productId) => {
  assertDatabaseReady();
  await assertProductExists(productId);

  const options = await ProductOption.find({ productId }).sort({ sortOrder: 1, name: 1, createdAt: 1 }).lean().exec();
  const valuesByOptionId = await getValuesByOptionIds(options.map((option) => option._id));

  return options.map((option) => formatProductOption(
    option,
    valuesByOptionId.get(option._id.toString()) || [],
  ));
};

const getProductOption = async (productId, optionId) => {
  assertDatabaseReady();
  const option = await getOptionDocument(productId, optionId);
  const values = await ProductOptionValue.find({ productOptionId: option._id }).sort({ sortOrder: 1, value: 1, createdAt: 1 }).lean().exec();

  return formatProductOption(option, values);
};

const updateProductOption = async (productId, optionId, payload) => {
  assertDatabaseReady();
  const option = await getOptionDocument(productId, optionId);
  const optionPayload = buildProductOptionPayload(payload);

  if (Object.keys(optionPayload).length === 0) {
    throw new ApiError(400, 'No product option fields provided to update');
  }

  if (hasOwn(optionPayload, 'name') && optionPayload.name !== option.name) {
    await assertOptionIsNotUsedByVariants(productId, option);
    await assertOptionNameAvailable(productId, optionPayload.name, option._id);
  }

  Object.assign(option, optionPayload);

  try {
    await option.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'Product option name already exists');
    }

    throw error;
  }

  return getProductOption(productId, option._id);
};

const deleteProductOption = async (productId, optionId) => {
  assertDatabaseReady();
  const option = await getOptionDocument(productId, optionId);
  const deletedOption = await getProductOption(productId, option._id);

  await assertOptionIsNotUsedByVariants(productId, option);
  await ProductOptionValue.deleteMany({ productOptionId: option._id }).exec();
  await option.deleteOne();

  return deletedOption;
};

const createProductOptionValue = async (productId, optionId, payload) => {
  assertDatabaseReady();
  const option = await getOptionDocument(productId, optionId);
  const optionValuePayload = normalizeOptionValuePayload(payload, { requireValue: true });

  await assertOptionValueAvailable(option._id, optionValuePayload.value);

  let optionValue;

  try {
    optionValue = await ProductOptionValue.create({
      ...optionValuePayload,
      productOptionId: option._id,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'Product option value already exists');
    }

    throw error;
  }

  return formatOptionValue(optionValue);
};

const listProductOptionValues = async (productId, optionId) => {
  assertDatabaseReady();
  const option = await getOptionDocument(productId, optionId);
  const values = await ProductOptionValue.find({ productOptionId: option._id })
    .sort({ sortOrder: 1, value: 1, createdAt: 1 })
    .lean()
    .exec();

  return values.map(formatOptionValue);
};

const getProductOptionValue = async (productId, optionId, valueId) => {
  assertDatabaseReady();
  const { optionValue } = await getOptionValueDocument(productId, optionId, valueId);

  return formatOptionValue(optionValue);
};

const updateProductOptionValue = async (productId, optionId, valueId, payload) => {
  assertDatabaseReady();
  const { option, optionValue } = await getOptionValueDocument(productId, optionId, valueId);
  const optionValuePayload = normalizeOptionValuePayload(payload);

  if (Object.keys(optionValuePayload).length === 0) {
    throw new ApiError(400, 'No product option value fields provided to update');
  }

  if (hasOwn(optionValuePayload, 'value') && optionValuePayload.value !== optionValue.value) {
    await assertOptionValueIsNotUsedByVariants(productId, option, optionValue);
    await assertOptionValueAvailable(option._id, optionValuePayload.value, optionValue._id);
  }

  Object.assign(optionValue, optionValuePayload);

  try {
    await optionValue.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'Product option value already exists');
    }

    throw error;
  }

  return formatOptionValue(optionValue);
};

const deleteProductOptionValue = async (productId, optionId, valueId) => {
  assertDatabaseReady();
  const { option, optionValue } = await getOptionValueDocument(productId, optionId, valueId);
  const deletedOptionValue = formatOptionValue(optionValue);

  await assertOptionValueIsNotUsedByVariants(productId, option, optionValue);
  await optionValue.deleteOne();

  return deletedOptionValue;
};

export {
  createProductOption,
  createProductOptionValue,
  deleteProductOption,
  deleteProductOptionValue,
  formatOptionValue,
  formatProductOption,
  getProductOption,
  getProductOptionValue,
  listProductOptionValues,
  listProductOptions,
  updateProductOption,
  updateProductOptionValue,
};

export default {
  createProductOption,
  createProductOptionValue,
  deleteProductOption,
  deleteProductOptionValue,
  formatOptionValue,
  formatProductOption,
  getProductOption,
  getProductOptionValue,
  listProductOptionValues,
  listProductOptions,
  updateProductOption,
  updateProductOptionValue,
};
