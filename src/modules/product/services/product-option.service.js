import mongoose from 'mongoose';

import ApiError from '@/common/errors/api.error.js';
import ProductOptionValue from '@/modules/product/models/product-option-value.model.js';
import ProductOption from '@/modules/product/models/product-option.model.js';
import ProductVariant from '@/modules/product/models/product-variant.model.js';
import Product from '@/modules/product/models/product.model.js';

const hasOwn = (object, field) => Object.prototype.hasOwnProperty.call(object, field);

const assertDatabaseReady = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new ApiError(503, 'Database connection is not ready. Check MONGO_URI and start MongoDB.');
  }
};

const assertValidObjectId = (value, field) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${field}`);
  }
};

const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  createdAt: optionValue.createdAt,
  updatedAt: optionValue.updatedAt,
});

const formatProductOption = (option, values = []) => ({
  id: option.id || option._id?.toString(),
  productId: option.productId?.toString(),
  name: option.name,
  values: values.map(formatOptionValue),
  createdAt: option.createdAt,
  updatedAt: option.updatedAt,
});

const normalizeOptionPayload = (payload = {}, { requireName = false } = {}) => {
  const optionPayload = {};

  if (hasOwn(payload, 'name')) {
    optionPayload.name = normalizeText(payload.name);
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

  if (requireValue && !optionValuePayload.value) {
    throw new ApiError(400, 'value is required');
  }

  if (hasOwn(optionValuePayload, 'value') && !optionValuePayload.value) {
    throw new ApiError(400, 'value cannot be empty');
  }

  return optionValuePayload;
};

const normalizeValues = (values = []) => {
  if (values === null || values === undefined || values === '') {
    return [];
  }

  const rawValues = Array.isArray(values) ? values : [values];
  const normalizedValues = rawValues
    .map((value) => normalizeText(typeof value === 'object' ? value.value : value))
    .filter(Boolean);
  const seenValues = new Set();

  return normalizedValues.filter((value) => {
    const valueKey = value.toLowerCase();

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
  }).sort({ value: 1, createdAt: 1 }).lean().exec();
  const valuesByOptionId = new Map();

  for (const value of values) {
    const optionId = value.productOptionId.toString();
    const optionValues = valuesByOptionId.get(optionId) || [];

    optionValues.push(value);
    valuesByOptionId.set(optionId, optionValues);
  }

  return valuesByOptionId;
};

const assertOptionIsNotUsedByVariants = async (productId, optionName) => {
  const variantUsingOption = await ProductVariant.exists({
    productId,
    'optionValues.optionName': optionName,
  }).exec();

  if (variantUsingOption) {
    throw new ApiError(409, 'Cannot change or delete an option that is used by variants');
  }
};

const assertOptionValueIsNotUsedByVariants = async (productId, optionName, optionValue) => {
  const variantUsingOptionValue = await ProductVariant.exists({
    productId,
    optionValues: {
      $elemMatch: {
        optionName,
        value: optionValue,
      },
    },
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

  for (const value of normalizeValues(payload.values)) {
    await assertOptionValueAvailable(option._id, value);

    try {
      values.push(await ProductOptionValue.create({
        productOptionId: option._id,
        value,
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

  const options = await ProductOption.find({ productId }).sort({ name: 1, createdAt: 1 }).lean().exec();
  const valuesByOptionId = await getValuesByOptionIds(options.map((option) => option._id));

  return options.map((option) => formatProductOption(
    option,
    valuesByOptionId.get(option._id.toString()) || [],
  ));
};

const getProductOption = async (productId, optionId) => {
  assertDatabaseReady();
  const option = await getOptionDocument(productId, optionId);
  const values = await ProductOptionValue.find({ productOptionId: option._id }).sort({ value: 1, createdAt: 1 }).lean().exec();

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
    await assertOptionIsNotUsedByVariants(productId, option.name);
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

  await assertOptionIsNotUsedByVariants(productId, option.name);
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
    .sort({ value: 1, createdAt: 1 })
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
    await assertOptionValueIsNotUsedByVariants(productId, option.name, optionValue.value);
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

  await assertOptionValueIsNotUsedByVariants(productId, option.name, optionValue.value);
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
