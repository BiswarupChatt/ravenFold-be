const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const createValidationError = (message) => {
  const error = new Error(message);

  error.name = 'SchemaValidationError';

  return error;
};

const fail = (message) => {
  throw createValidationError(message);
};

const createSchema = (validator) => ({
  validate(value) {
    try {
      return {
        error: null,
        value: validator(value),
      };
    } catch (error) {
      const details = Array.isArray(error?.details)
        ? error.details
        : [error?.message || 'Validation failed'];

      return {
        error: {
          details: details.map((detail) => ({ message: String(detail) })),
        },
        value,
      };
    }
  },
});

const expectObject = (value, field = 'body') => {
  if (!isPlainObject(value)) {
    fail(`${field} must be an object`);
  }

  return value;
};

const assertNoUnknownKeys = (value, allowedKeys, field = 'body') => {
  const unknownKeys = Object.keys(value).filter((key) => !allowedKeys.includes(key));

  if (unknownKeys.length > 0) {
    fail(`${field} contains unsupported field(s): ${unknownKeys.join(', ')}`);
  }
};

const assertRequiredKeys = (value, keys, field = 'body') => {
  const missingKeys = keys.filter((key) => !Object.prototype.hasOwnProperty.call(value, key));

  if (missingKeys.length > 0) {
    fail(`${field} is missing required field(s): ${missingKeys.join(', ')}`);
  }
};

const assertAtLeastOneKey = (value, keys, field = 'body') => {
  const hasAtLeastOneKey = keys.some((key) => Object.prototype.hasOwnProperty.call(value, key));

  if (!hasAtLeastOneKey) {
    fail(`${field} must include at least one supported field`);
  }
};

const assertScalarField = (value, key, field = 'body') => {
  if (!Object.prototype.hasOwnProperty.call(value, key)) {
    return;
  }

  const fieldValue = value[key];

  if (fieldValue === null || fieldValue === undefined) {
    return;
  }

  if (!['string', 'number', 'boolean'].includes(typeof fieldValue)) {
    fail(`${field}.${key} must be a scalar value`);
  }
};

const assertStringLikeField = assertScalarField;

const assertBooleanField = (value, key, field = 'body') => {
  if (!Object.prototype.hasOwnProperty.call(value, key)) {
    return;
  }

  const fieldValue = value[key];

  if (typeof fieldValue === 'boolean') {
    return;
  }

  if (typeof fieldValue === 'string' && ['true', 'false'].includes(fieldValue.trim().toLowerCase())) {
    return;
  }

  fail(`${field}.${key} must be a boolean`);
};

const assertNumberLikeField = (value, key, field = 'body') => {
  if (!Object.prototype.hasOwnProperty.call(value, key)) {
    return;
  }

  const fieldValue = value[key];
  const numericValue = typeof fieldValue === 'number' ? fieldValue : Number(fieldValue);

  if (!Number.isFinite(numericValue)) {
    fail(`${field}.${key} must be a number`);
  }
};

const assertArrayField = (value, key, field = 'body') => {
  if (!Object.prototype.hasOwnProperty.call(value, key)) {
    return;
  }

  if (!Array.isArray(value[key])) {
    fail(`${field}.${key} must be an array`);
  }
};

const assertObjectField = (value, key, field = 'body') => {
  if (!Object.prototype.hasOwnProperty.call(value, key)) {
    return;
  }

  if (!isPlainObject(value[key])) {
    fail(`${field}.${key} must be an object`);
  }
};

const assertImageAssetValue = (fieldValue, field) => {
  if (fieldValue === null || fieldValue === undefined) {
    return;
  }

  if (!isPlainObject(fieldValue)) {
    fail(`${field} must be an image asset object`);
  }

  if (!Object.prototype.hasOwnProperty.call(fieldValue, 'url') || typeof fieldValue.url !== 'string' || !fieldValue.url.trim()) {
    fail(`${field}.url must be a non-empty string`);
  }

  if (
    Object.prototype.hasOwnProperty.call(fieldValue, 'publicId')
    && fieldValue.publicId !== null
    && fieldValue.publicId !== undefined
    && typeof fieldValue.publicId !== 'string'
  ) {
    fail(`${field}.publicId must be a string`);
  }
};

const assertImageAssetField = (value, key, field = 'body') => {
  if (!Object.prototype.hasOwnProperty.call(value, key)) {
    return;
  }

  assertImageAssetValue(value[key], `${field}.${key}`);
};

const assertImageAssetArrayField = (value, key, field = 'body') => {
  if (!Object.prototype.hasOwnProperty.call(value, key)) {
    return;
  }

  assertArrayField(value, key, field);
  value[key].forEach((item, index) => assertImageAssetValue(item, `${field}.${key}[${index}]`));
};

const pickAllowedKeys = (value, allowedKeys) => Object.fromEntries(
  Object.entries(value).filter(([key]) => allowedKeys.includes(key)),
);

export {
  assertArrayField,
  assertAtLeastOneKey,
  assertBooleanField,
  assertImageAssetArrayField,
  assertImageAssetField,
  assertNoUnknownKeys,
  assertNumberLikeField,
  assertObjectField,
  assertRequiredKeys,
  assertScalarField,
  assertStringLikeField,
  createSchema,
  expectObject,
  pickAllowedKeys,
};
