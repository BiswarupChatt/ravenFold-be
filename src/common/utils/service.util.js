import mongoose from 'mongoose';

import ApiError from '@/common/errors/api.error.js';

const DATABASE_NOT_READY_MESSAGE = 'Database connection is not ready. Check MONGO_URI and start MongoDB.';

export const hasOwn = (source, field) => Object.prototype.hasOwnProperty.call(source, field);

export const assertDatabaseReady = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new ApiError(503, DATABASE_NOT_READY_MESSAGE);
  }
};

export const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

export const createObjectId = (value) => new mongoose.Types.ObjectId(value);

export const assertValidObjectId = (value, field) => {
  if (!isValidObjectId(value)) {
    throw new ApiError(400, `Invalid ${field}`);
  }
};

export const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const normalizeBoolean = (value, field) => {
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

export const normalizeObjectId = (value, field) => {
  const normalizedValue = normalizeText(value);

  assertValidObjectId(normalizedValue, field);

  return normalizedValue;
};

export const normalizeRequiredObjectId = (value, field) => {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    throw new ApiError(400, `${field} is required`);
  }

  assertValidObjectId(normalizedValue, field);

  return normalizedValue;
};

export const normalizeOptionalObjectId = (value, field) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return normalizeObjectId(value, field);
};

export const normalizeMoney = (value, field, { required = false } = {}) => {
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

export const normalizeOptionalNumber = (value, field) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new ApiError(400, `${field} must be a number`);
  }

  if (numberValue < 0) {
    throw new ApiError(400, `${field} cannot be negative`);
  }

  return numberValue;
};

export const normalizeStringArray = (value, field, { splitString = false, lowercase = false } = {}) => {
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

export const normalizeNonNegativeInteger = (value, field) => {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new ApiError(400, `${field} must be a non-negative integer`);
  }

  return numberValue;
};

export const normalizePositiveInteger = (value, field = 'quantity') => {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new ApiError(400, `${field} must be a positive integer`);
  }

  return numberValue;
};

export const normalizeNonZeroInteger = (value, field = 'quantity') => {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue === 0) {
    throw new ApiError(400, `${field} must be a non-zero integer`);
  }

  return numberValue;
};

export const getDocumentId = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'object' && value._id) {
    return value._id.toString();
  }

  return value.toString();
};
