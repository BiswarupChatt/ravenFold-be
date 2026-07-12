import promotionConfig from '@/config/promotion.config.js';
import {
  normalizeOptionalObjectId,
  normalizePositiveInteger,
  normalizeText,
} from '@/common/utils/service.util.js';

const roundAmount = (value) => Number(Number(value || 0).toFixed(2));

const normalizeDateValue = (value) => {
  if (!value) {
    return null;
  }

  const dateValue = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(dateValue.getTime())) {
    return null;
  }

  return dateValue;
};

const normalizeContextItem = (item = {}) => {
  const quantity = normalizePositiveInteger(item.quantity, 'promotion context item quantity');
  const unitPrice = roundAmount(item.unitPrice);
  const lineSubtotal = item.lineSubtotal === null || item.lineSubtotal === undefined
    ? roundAmount(quantity * unitPrice)
    : roundAmount(item.lineSubtotal);

  return {
    categoryId: normalizeOptionalObjectId(item.categoryId, 'promotion context item categoryId'),
    lineSubtotal,
    productId: normalizeOptionalObjectId(item.productId, 'promotion context item productId'),
    quantity,
    requiresShipping: item.requiresShipping !== false,
    unitPrice,
    variantId: normalizeOptionalObjectId(item.variantId, 'promotion context item variantId'),
  };
};

const normalizePromotionContext = (context = {}) => {
  const rawItems = Array.isArray(context.items) ? context.items : [];
  const items = rawItems.map(normalizeContextItem);
  const subtotal = roundAmount(
    context.subtotal === null || context.subtotal === undefined
      ? items.reduce((sum, item) => sum + item.lineSubtotal, 0)
      : context.subtotal,
  );

  return {
    cartId: normalizeOptionalObjectId(context.cartId, 'promotion context cartId'),
    couponCode: normalizeText(context.couponCode).toUpperCase(),
    items,
    shippingCharge: roundAmount(context.shippingCharge),
    subtotal,
    user: {
      createdAt: normalizeDateValue(context.user?.createdAt),
      successfulOrderCount: Number.isInteger(Number(context.user?.successfulOrderCount))
        ? Number(context.user.successfulOrderCount)
        : 0,
    },
    userId: normalizeOptionalObjectId(context.userId, 'promotion context userId'),
  };
};

const getNewUserEligibilityCutoffDate = (now = new Date()) => {
  const cutoffDate = new Date(now);

  cutoffDate.setDate(cutoffDate.getDate() - promotionConfig.newUserEligibilityDays);

  return cutoffDate;
};

export {
  getNewUserEligibilityCutoffDate,
  normalizeContextItem,
  normalizePromotionContext,
  roundAmount,
};

export default {
  getNewUserEligibilityCutoffDate,
  normalizeContextItem,
  normalizePromotionContext,
  roundAmount,
};
