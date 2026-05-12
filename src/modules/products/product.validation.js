import mongoose from 'mongoose';

import {
  allowedProductStatuses,
  allowedProductTypes,
} from '@/modules/products/product.model.js';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const productBodyFields = new Set([
  'brandId',
  'categoryIds',
  'description',
  'hasVariants',
  'mediaIds',
  'productType',
  'seo',
  'shipping',
  'shortDescription',
  'slug',
  'status',
  'tagIds',
  'tags',
  'thumbnail',
  'title',
]);

const createValidationError = (messages) => {
  return {
    details: messages.map((message) => ({ message })),
  };
};

const isPlainObject = (value) => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const hasOwn = (payload, field) => {
  return Object.prototype.hasOwnProperty.call(payload, field);
};

const normalizeString = (payload, field, errors, options = {}) => {
  if (!hasOwn(payload, field)) {
    return undefined;
  }

  if (typeof payload[field] !== 'string') {
    errors.push(`${field} must be a string`);
    return undefined;
  }

  const value = payload[field].trim();

  if (options.required && !value) {
    errors.push(`${field} is required`);
  }

  if (options.maxLength && value.length > options.maxLength) {
    errors.push(`${field} must be at most ${options.maxLength} characters`);
  }

  if (options.lowercase) {
    return value.toLowerCase();
  }

  return value;
};

const normalizeBoolean = (payload, field, errors) => {
  if (!hasOwn(payload, field)) {
    return undefined;
  }

  if (typeof payload[field] !== 'boolean') {
    errors.push(`${field} must be a boolean`);
    return undefined;
  }

  return payload[field];
};

const normalizeEnum = (payload, field, allowedValues, errors) => {
  if (!hasOwn(payload, field)) {
    return undefined;
  }

  if (!allowedValues.includes(payload[field])) {
    errors.push(`${field} must be one of: ${allowedValues.join(', ')}`);
    return undefined;
  }

  return payload[field];
};

const normalizeObjectId = (payload, field, errors, options = {}) => {
  if (!hasOwn(payload, field)) {
    return undefined;
  }

  const value = payload[field];

  if (value === null && options.allowNull) {
    return null;
  }

  if (!mongoose.isValidObjectId(value)) {
    errors.push(`${field} must be a valid objectId`);
    return undefined;
  }

  return value;
};

const normalizeObjectIdArray = (payload, field, errors) => {
  if (!hasOwn(payload, field)) {
    return undefined;
  }

  if (!Array.isArray(payload[field])) {
    errors.push(`${field} must be an array`);
    return undefined;
  }

  const values = payload[field].filter((value) => value !== null && value !== undefined && value !== '');
  const invalidValue = values.find((value) => !mongoose.isValidObjectId(value));

  if (invalidValue) {
    errors.push(`${field} must contain only valid objectIds`);
    return undefined;
  }

  return values;
};

const normalizeStringArray = (payload, field, errors, options = {}) => {
  if (!hasOwn(payload, field)) {
    return undefined;
  }

  if (!Array.isArray(payload[field])) {
    errors.push(`${field} must be an array`);
    return undefined;
  }

  const values = [];

  payload[field].forEach((item, index) => {
    if (typeof item !== 'string') {
      errors.push(`${field}.${index} must be a string`);
      return;
    }

    const normalized = options.lowercase ? item.trim().toLowerCase() : item.trim();

    if (normalized) {
      values.push(normalized);
    }
  });

  return [...new Set(values)];
};

const normalizeNonNegativeNumber = (payload, field, errors) => {
  if (!hasOwn(payload, field)) {
    return undefined;
  }

  const value = Number(payload[field]);

  if (!Number.isFinite(value) || value < 0) {
    errors.push(`${field} must be a non-negative number`);
    return undefined;
  }

  return value;
};

const normalizeSeo = (payload, errors) => {
  if (!hasOwn(payload, 'seo')) {
    return undefined;
  }

  if (!isPlainObject(payload.seo)) {
    errors.push('seo must be an object');
    return undefined;
  }

  const seo = {};
  const title = normalizeString(payload.seo, 'title', errors);
  const description = normalizeString(payload.seo, 'description', errors);
  const keywords = normalizeStringArray(payload.seo, 'keywords', errors, { lowercase: true });

  if (title !== undefined) {
    seo.title = title;
  }

  if (description !== undefined) {
    seo.description = description;
  }

  if (keywords !== undefined) {
    seo.keywords = keywords;
  }

  return seo;
};

const normalizeShipping = (payload, errors) => {
  if (!hasOwn(payload, 'shipping')) {
    return undefined;
  }

  if (!isPlainObject(payload.shipping)) {
    errors.push('shipping must be an object');
    return undefined;
  }

  return ['height', 'length', 'weight', 'width'].reduce((shipping, field) => {
    const value = normalizeNonNegativeNumber(payload.shipping, field, errors);

    if (value !== undefined) {
      shipping[field] = value;
    }

    return shipping;
  }, {});
};

const normalizeProductBody = (payload = {}, options = {}) => {
  const errors = [];
  const value = {};

  if (!isPlainObject(payload)) {
    return {
      error: createValidationError(['Request body must be an object']),
      value: {},
    };
  }

  const unknownFields = Object.keys(payload).filter((field) => !productBodyFields.has(field));

  if (unknownFields.length) {
    errors.push(`Unknown product fields: ${unknownFields.join(', ')}`);
  }

  const title = normalizeString(payload, 'title', errors, { maxLength: 180, required: options.requireTitle });
  const slug = normalizeString(payload, 'slug', errors, { lowercase: true });
  const shortDescription = normalizeString(payload, 'shortDescription', errors, { maxLength: 300 });
  const description = normalizeString(payload, 'description', errors);
  const productType = normalizeEnum(payload, 'productType', allowedProductTypes, errors);
  const status = normalizeEnum(payload, 'status', allowedProductStatuses, errors);
  const hasVariants = normalizeBoolean(payload, 'hasVariants', errors);
  const brandId = normalizeObjectId(payload, 'brandId', errors, { allowNull: true });
  const thumbnail = normalizeObjectId(payload, 'thumbnail', errors, { allowNull: true });
  const categoryIds = normalizeObjectIdArray(payload, 'categoryIds', errors);
  const mediaIds = normalizeObjectIdArray(payload, 'mediaIds', errors);
  const tagIds = normalizeObjectIdArray(payload, 'tagIds', errors);
  const tags = normalizeStringArray(payload, 'tags', errors, { lowercase: true });
  const seo = normalizeSeo(payload, errors);
  const shipping = normalizeShipping(payload, errors);

  if (slug && !slugPattern.test(slug)) {
    errors.push('slug must contain lowercase letters, numbers, and hyphens only');
  }

  if (title !== undefined) {
    value.title = title;
  }

  if (slug !== undefined) {
    value.slug = slug;
  }

  if (shortDescription !== undefined) {
    value.shortDescription = shortDescription;
  }

  if (description !== undefined) {
    value.description = description;
  }

  if (productType !== undefined) {
    value.productType = productType;
  }

  if (status !== undefined) {
    value.status = status;
  }

  if (hasVariants !== undefined) {
    value.hasVariants = hasVariants;
  }

  if (brandId !== undefined) {
    value.brandId = brandId;
  }

  if (thumbnail !== undefined) {
    value.thumbnail = thumbnail;
  }

  if (categoryIds !== undefined) {
    value.categoryIds = categoryIds;
  }

  if (mediaIds !== undefined) {
    value.mediaIds = mediaIds;
  }

  if (tagIds !== undefined) {
    value.tagIds = tagIds;
  }

  if (tags !== undefined) {
    value.tags = tags;
  }

  if (seo !== undefined) {
    value.seo = seo;
  }

  if (shipping !== undefined) {
    value.shipping = shipping;
  }

  if (options.requireTitle && !hasOwn(payload, 'title')) {
    errors.push('title is required');
  }

  if (options.requireUpdate && Object.keys(value).length === 0) {
    errors.push('At least one product field is required');
  }

  return errors.length ? { error: createValidationError(errors), value } : { value };
};

const createProductSchema = {
  validate(payload) {
    return normalizeProductBody(payload, { requireTitle: true });
  },
};

const updateProductSchema = {
  validate(payload) {
    return normalizeProductBody(payload, { requireUpdate: true });
  },
};

const listProductsQuerySchema = {
  validate(query = {}) {
    const errors = [];
    const value = {};

    if (query.page !== undefined) {
      const page = Number(query.page);

      if (!Number.isInteger(page) || page < 1) {
        errors.push('page must be a positive integer');
      } else {
        value.page = page;
      }
    }

    if (query.limit !== undefined) {
      const limit = Number(query.limit);

      if (!Number.isInteger(limit) || limit < 1) {
        errors.push('limit must be a positive integer');
      } else {
        value.limit = limit;
      }
    }

    if (query.status !== undefined) {
      if (!allowedProductStatuses.includes(query.status)) {
        errors.push(`status must be one of: ${allowedProductStatuses.join(', ')}`);
      } else {
        value.status = query.status;
      }
    }

    if (query.productType !== undefined) {
      if (!allowedProductTypes.includes(query.productType)) {
        errors.push(`productType must be one of: ${allowedProductTypes.join(', ')}`);
      } else {
        value.productType = query.productType;
      }
    }

    if (query.categoryId !== undefined) {
      if (!mongoose.isValidObjectId(query.categoryId)) {
        errors.push('categoryId must be a valid objectId');
      } else {
        value.categoryId = query.categoryId;
      }
    }

    if (query.search !== undefined) {
      value.search = String(query.search).trim();
    }

    if (query.sort !== undefined) {
      value.sort = String(query.sort).trim();
    }

    return errors.length ? { error: createValidationError(errors), value } : { value };
  },
};

const productIdParamSchema = {
  validate(params = {}) {
    if (!mongoose.isValidObjectId(params.productId)) {
      return {
        error: createValidationError(['productId must be a valid objectId']),
        value: params,
      };
    }

    return { value: params };
  },
};

export {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  updateProductSchema,
};

export default {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  updateProductSchema,
};
