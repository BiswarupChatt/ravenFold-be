import {
  createSchema,
  expectObject,
} from '@/common/utils/request-schema.util.js';
import {
  normalizeBoolean,
  normalizeMoney,
  normalizeNonNegativeInteger,
  normalizeObjectId,
  normalizeOptionalNumber,
  normalizeOptionalObjectId,
  normalizeText,
} from '@/common/utils/service.util.js';
import {
  PROMOTION_APPLICABLE_ON,
  PROMOTION_DISCOUNT_METHOD,
  PROMOTION_TYPE,
  promotionApplicableOnValues,
  promotionDiscountMethods,
  promotionTypes,
} from '@/modules/promotion/constants/promotion.constants.js';

const createPromotionFields = [
  'title',
  'description',
  'type',
  'applicableOn',
  'productIds',
  'categoryIds',
  'couponCode',
  'discountValue',
  'discountMethod',
  'maxDiscountAmount',
  'minOrderAmount',
  'buyQuantity',
  'getQuantity',
  'usageLimit',
  'perUserLimit',
  'priority',
  'isStackable',
  'isAutomatic',
  'isActive',
  'startDate',
  'endDate',
];

const updatePromotionFields = [...createPromotionFields];

const statusFields = ['isActive'];

const normalizeEnum = (value, field, allowedValues) => {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return '';
  }

  if (!allowedValues.includes(normalizedValue)) {
    throw new Error(`${field} must be one of: ${allowedValues.join(', ')}`);
  }

  return normalizedValue;
};

const normalizeDateValue = (value, field) => {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return null;
  }

  const dateValue = new Date(normalizedValue);

  if (Number.isNaN(dateValue.getTime())) {
    throw new Error(`${field} must be a valid date`);
  }

  return dateValue;
};

const normalizeObjectIdArray = (value, field) => {
  if (value === null || value === undefined || value === '') {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array`);
  }

  return [...new Set(value.map((item) => normalizeObjectId(item, field)))];
};

const assertNoUnknownKeys = (payload, allowedKeys, field = 'body') => {
  const unknownKeys = Object.keys(payload).filter((key) => !allowedKeys.includes(key));

  if (unknownKeys.length > 0) {
    throw new Error(`${field} contains unsupported field(s): ${unknownKeys.join(', ')}`);
  }
};

const assertRequiredKeys = (payload, requiredKeys, field = 'body') => {
  const missingKeys = requiredKeys.filter((key) => !Object.prototype.hasOwnProperty.call(payload, key));

  if (missingKeys.length > 0) {
    throw new Error(`${field} is missing required field(s): ${missingKeys.join(', ')}`);
  }
};

const assertAtLeastOneKey = (payload, supportedKeys, field = 'body') => {
  const hasAtLeastOne = supportedKeys.some((key) => Object.prototype.hasOwnProperty.call(payload, key));

  if (!hasAtLeastOne) {
    throw new Error(`${field} must include at least one supported field`);
  }
};

const parsePromotionPayload = (value, { isUpdate = false } = {}) => {
  const payload = expectObject(value);
  const allowedKeys = isUpdate ? updatePromotionFields : createPromotionFields;

  assertNoUnknownKeys(payload, allowedKeys);

  if (isUpdate) {
    assertAtLeastOneKey(payload, allowedKeys);
  } else {
    assertRequiredKeys(payload, ['title', 'type']);
  }

  const normalizedPayload = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'title')) {
    normalizedPayload.title = normalizeText(payload.title);

    if (!normalizedPayload.title) {
      throw new Error('title is required');
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'description')) {
    normalizedPayload.description = normalizeText(payload.description);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'type')) {
    normalizedPayload.type = normalizeEnum(payload.type, 'type', promotionTypes);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'applicableOn')) {
    normalizedPayload.applicableOn = normalizeEnum(payload.applicableOn, 'applicableOn', promotionApplicableOnValues);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'productIds')) {
    normalizedPayload.productIds = normalizeObjectIdArray(payload.productIds, 'productIds');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'categoryIds')) {
    normalizedPayload.categoryIds = normalizeObjectIdArray(payload.categoryIds, 'categoryIds');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'couponCode')) {
    normalizedPayload.couponCode = normalizeText(payload.couponCode).toUpperCase();
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'discountValue')) {
    normalizedPayload.discountValue = normalizeMoney(payload.discountValue, 'discountValue');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'discountMethod')) {
    normalizedPayload.discountMethod = normalizeEnum(payload.discountMethod, 'discountMethod', promotionDiscountMethods);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'maxDiscountAmount')) {
    normalizedPayload.maxDiscountAmount = normalizeMoney(payload.maxDiscountAmount, 'maxDiscountAmount');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'minOrderAmount')) {
    normalizedPayload.minOrderAmount = normalizeMoney(payload.minOrderAmount, 'minOrderAmount');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'buyQuantity')) {
    normalizedPayload.buyQuantity = normalizeOptionalNumber(payload.buyQuantity, 'buyQuantity');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'getQuantity')) {
    normalizedPayload.getQuantity = normalizeOptionalNumber(payload.getQuantity, 'getQuantity');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'usageLimit')) {
    normalizedPayload.usageLimit = payload.usageLimit === null || payload.usageLimit === ''
      ? null
      : normalizeNonNegativeInteger(payload.usageLimit, 'usageLimit');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'perUserLimit')) {
    normalizedPayload.perUserLimit = payload.perUserLimit === null || payload.perUserLimit === ''
      ? null
      : normalizeNonNegativeInteger(payload.perUserLimit, 'perUserLimit');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'priority')) {
    normalizedPayload.priority = Number(payload.priority);

    if (!Number.isInteger(normalizedPayload.priority)) {
      throw new Error('priority must be an integer');
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'isStackable')) {
    normalizedPayload.isStackable = normalizeBoolean(payload.isStackable, 'isStackable');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'isAutomatic')) {
    normalizedPayload.isAutomatic = normalizeBoolean(payload.isAutomatic, 'isAutomatic');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'isActive')) {
    normalizedPayload.isActive = normalizeBoolean(payload.isActive, 'isActive');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'startDate')) {
    normalizedPayload.startDate = normalizeDateValue(payload.startDate, 'startDate');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'endDate')) {
    normalizedPayload.endDate = normalizeDateValue(payload.endDate, 'endDate');
  }

  const promotionType = normalizedPayload.type || (!isUpdate ? '' : null);
  const applicableOn = normalizedPayload.applicableOn || PROMOTION_APPLICABLE_ON.ALL_PRODUCTS;

  if (normalizedPayload.startDate && normalizedPayload.endDate && normalizedPayload.startDate > normalizedPayload.endDate) {
    throw new Error('endDate must be greater than or equal to startDate');
  }

  if (normalizedPayload.perUserLimit !== null
    && normalizedPayload.perUserLimit !== undefined
    && normalizedPayload.usageLimit !== null
    && normalizedPayload.usageLimit !== undefined
    && normalizedPayload.perUserLimit > normalizedPayload.usageLimit) {
    throw new Error('perUserLimit cannot be greater than usageLimit');
  }

  if (promotionType) {
    if (applicableOn === PROMOTION_APPLICABLE_ON.SPECIFIC_PRODUCTS && !(normalizedPayload.productIds || []).length) {
      throw new Error('productIds is required when applicableOn is SPECIFIC_PRODUCTS');
    }

    if (applicableOn === PROMOTION_APPLICABLE_ON.SPECIFIC_CATEGORIES && !(normalizedPayload.categoryIds || []).length) {
      throw new Error('categoryIds is required when applicableOn is SPECIFIC_CATEGORIES');
    }

    if (promotionType === PROMOTION_TYPE.PRODUCT_DISCOUNT && !(normalizedPayload.productIds || []).length) {
      throw new Error('productIds is required for PRODUCT_DISCOUNT promotions');
    }

    if (promotionType === PROMOTION_TYPE.CATEGORY_DISCOUNT && !(normalizedPayload.categoryIds || []).length) {
      throw new Error('categoryIds is required for CATEGORY_DISCOUNT promotions');
    }

    if (promotionType === PROMOTION_TYPE.COUPON && !normalizedPayload.couponCode) {
      throw new Error('couponCode is required for COUPON promotions');
    }

    if (promotionType === PROMOTION_TYPE.COUPON && normalizedPayload.isAutomatic === true) {
      throw new Error('COUPON promotions cannot be automatic');
    }

    if (
      [
        PROMOTION_TYPE.PERCENTAGE_DISCOUNT,
        PROMOTION_TYPE.CATEGORY_DISCOUNT,
        PROMOTION_TYPE.PRODUCT_DISCOUNT,
        PROMOTION_TYPE.FIRST_ORDER,
        PROMOTION_TYPE.NEW_USER,
      ].includes(promotionType)
    ) {
      if (normalizedPayload.discountValue === null || normalizedPayload.discountValue === undefined) {
        throw new Error('discountValue is required for this promotion type');
      }

      if (normalizedPayload.discountValue <= 0 || normalizedPayload.discountValue > 100) {
        throw new Error('discountValue must be greater than 0 and less than or equal to 100');
      }
    }

    if (promotionType === PROMOTION_TYPE.FIXED_DISCOUNT) {
      if (normalizedPayload.discountValue === null || normalizedPayload.discountValue === undefined || normalizedPayload.discountValue <= 0) {
        throw new Error('discountValue must be greater than 0 for FIXED_DISCOUNT');
      }
    }

    if (promotionType === PROMOTION_TYPE.BUY_X_GET_Y) {
      if (!normalizedPayload.buyQuantity || normalizedPayload.buyQuantity <= 0) {
        throw new Error('Buy quantity is required and must be greater than 0 for Buy X Get Y promotions.');
      }

      if (!normalizedPayload.getQuantity || normalizedPayload.getQuantity <= 0) {
        throw new Error('Get quantity is required and must be greater than 0 for Buy X Get Y promotions.');
      }

      if (Object.prototype.hasOwnProperty.call(normalizedPayload, 'discountValue')
        || Object.prototype.hasOwnProperty.call(normalizedPayload, 'discountMethod')
        || Object.prototype.hasOwnProperty.call(normalizedPayload, 'maxDiscountAmount')) {
        throw new Error('Buy X Get Y promotions cannot define discount value, discount method, or max discount amount.');
      }
    }

    if (promotionType === PROMOTION_TYPE.CART_VALUE) {
      if (normalizedPayload.minOrderAmount === null || normalizedPayload.minOrderAmount === undefined || normalizedPayload.minOrderAmount <= 0) {
        throw new Error('minOrderAmount must be greater than 0 for CART_VALUE');
      }

      if (!normalizedPayload.discountMethod) {
        throw new Error('discountMethod is required for CART_VALUE');
      }

      if (normalizedPayload.discountValue === null || normalizedPayload.discountValue === undefined || normalizedPayload.discountValue <= 0) {
        throw new Error('discountValue must be greater than 0 for CART_VALUE');
      }
    }

    if (promotionType === PROMOTION_TYPE.COUPON) {
      if (!normalizedPayload.discountMethod) {
        throw new Error('discountMethod is required for COUPON');
      }

      if (normalizedPayload.discountValue === null || normalizedPayload.discountValue === undefined || normalizedPayload.discountValue <= 0) {
        throw new Error('discountValue must be greater than 0 for COUPON');
      }
    }

    if (
      [PROMOTION_TYPE.COUPON, PROMOTION_TYPE.CART_VALUE].includes(promotionType)
      && normalizedPayload.discountMethod === PROMOTION_DISCOUNT_METHOD.PERCENTAGE
      && normalizedPayload.discountValue > 100
    ) {
      throw new Error('discountValue must be less than or equal to 100 for percentage discounts');
    }

    if (promotionType === PROMOTION_TYPE.FREE_SHIPPING) {
      if (Object.prototype.hasOwnProperty.call(normalizedPayload, 'discountValue')
        || Object.prototype.hasOwnProperty.call(normalizedPayload, 'discountMethod')
        || Object.prototype.hasOwnProperty.call(normalizedPayload, 'maxDiscountAmount')) {
        throw new Error('FREE_SHIPPING promotions cannot define discountValue, discountMethod, or maxDiscountAmount');
      }
    }
  }

  return normalizedPayload;
};

const createPromotionSchema = createSchema((value) => parsePromotionPayload(value, { isUpdate: false }));

const updatePromotionSchema = createSchema((value) => parsePromotionPayload(value, { isUpdate: true }));

const updatePromotionStatusSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, statusFields);
  assertRequiredKeys(payload, ['isActive']);

  return {
    isActive: normalizeBoolean(payload.isActive, 'isActive'),
  };
});

const promotionQuerySchema = createSchema((value) => {
  const payload = value && typeof value === 'object' ? value : {};

  return {
    applicableOn: normalizeEnum(payload.applicableOn, 'applicableOn', promotionApplicableOnValues) || undefined,
    couponCode: normalizeText(payload.couponCode).toUpperCase() || undefined,
    createdBy: normalizeOptionalObjectId(payload.createdBy, 'createdBy'),
    isActive: Object.prototype.hasOwnProperty.call(payload, 'isActive')
      ? normalizeBoolean(payload.isActive, 'isActive')
      : undefined,
    type: normalizeEnum(payload.type, 'type', promotionTypes) || undefined,
  };
});

export {
  createPromotionSchema,
  promotionQuerySchema,
  updatePromotionSchema,
  updatePromotionStatusSchema,
};
