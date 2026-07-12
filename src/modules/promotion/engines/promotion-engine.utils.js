import {
  PROMOTION_APPLICABLE_ON,
  PROMOTION_DISCOUNT_METHOD,
} from '@/modules/promotion/constants/promotion.constants.js';
import { roundAmount } from '@/modules/promotion/services/promotion-context.service.js';

const getItemKey = (item = {}) => `${item.productId || ''}:${item.variantId || ''}`;

const sumItemSubtotals = (items = []) => roundAmount(
  items.reduce((sum, item) => sum + Number(item.lineSubtotal || 0), 0),
);

const getApplicableItemMatchers = (promotion = {}) => ({
  categoryIds: new Set((promotion.categoryIds || []).map((value) => value?.toString?.() || String(value))),
  productIds: new Set((promotion.productIds || []).map((value) => value?.toString?.() || String(value))),
});

const getEligibleItems = (promotion = {}, context = {}) => {
  const items = Array.isArray(context.items) ? context.items : [];
  const applicableOn = promotion.applicableOn || PROMOTION_APPLICABLE_ON.ALL_PRODUCTS;
  const { categoryIds, productIds } = getApplicableItemMatchers(promotion);

  if (applicableOn === PROMOTION_APPLICABLE_ON.SPECIFIC_PRODUCTS) {
    return items.filter((item) => productIds.has(item.productId));
  }

  if (applicableOn === PROMOTION_APPLICABLE_ON.SPECIFIC_CATEGORIES) {
    return items.filter((item) => categoryIds.has(item.categoryId));
  }

  return items;
};

const meetsMinOrderAmount = (promotion = {}, context = {}) => {
  if (promotion.minOrderAmount === null || promotion.minOrderAmount === undefined) {
    return true;
  }

  return Number(context.subtotal || 0) >= Number(promotion.minOrderAmount || 0);
};

const capDiscountAmount = (discountAmount, maxDiscountAmount = null) => {
  if (maxDiscountAmount === null || maxDiscountAmount === undefined) {
    return roundAmount(discountAmount);
  }

  return roundAmount(Math.min(Number(discountAmount || 0), Number(maxDiscountAmount || 0)));
};

const buildProratedAffectedItems = (items = [], totalDiscountAmount = 0) => {
  const eligibleSubtotal = sumItemSubtotals(items);
  const totalDiscount = roundAmount(Math.min(Math.max(Number(totalDiscountAmount || 0), 0), eligibleSubtotal));

  if (!items.length || totalDiscount <= 0 || eligibleSubtotal <= 0) {
    return [];
  }

  let remainingDiscount = totalDiscount;

  return items.map((item, index) => {
    const itemSubtotal = roundAmount(item.lineSubtotal);
    const rawDiscount = index === items.length - 1
      ? remainingDiscount
      : roundAmount((itemSubtotal / eligibleSubtotal) * totalDiscount);
    const boundedDiscount = roundAmount(Math.min(rawDiscount, itemSubtotal, remainingDiscount));

    remainingDiscount = roundAmount(remainingDiscount - boundedDiscount);

    return {
      discountAmount: boundedDiscount,
      productId: item.productId,
      quantity: item.quantity,
      variantId: item.variantId || null,
    };
  }).filter((item) => item.discountAmount > 0);
};

const aggregateFreeItems = (units = []) => {
  const groupedItems = new Map();

  for (const unit of units) {
    const itemKey = getItemKey(unit);
    const existingItem = groupedItems.get(itemKey);

    if (existingItem) {
      existingItem.quantity += 1;
      continue;
    }

    groupedItems.set(itemKey, {
      productId: unit.productId,
      quantity: 1,
      unitPrice: roundAmount(unit.unitPrice),
      variantId: unit.variantId || null,
    });
  }

  return [...groupedItems.values()];
};

const expandItemsToUnits = (items = []) => {
  const units = [];

  for (const item of items) {
    for (let index = 0; index < Number(item.quantity || 0); index += 1) {
      units.push({
        productId: item.productId,
        unitPrice: roundAmount(item.unitPrice),
        variantId: item.variantId || null,
      });
    }
  }

  return units;
};

const applyDiscountByMethod = ({
  discountMethod = PROMOTION_DISCOUNT_METHOD.PERCENTAGE,
  discountValue = 0,
  eligibleItems = [],
  maxDiscountAmount = null,
}) => {
  const eligibleSubtotal = sumItemSubtotals(eligibleItems);

  if (eligibleSubtotal <= 0) {
    return {
      affectedItems: [],
      discountAmount: 0,
      eligibleSubtotal: 0,
    };
  }

  let discountAmount = 0;

  if (discountMethod === PROMOTION_DISCOUNT_METHOD.FIXED) {
    discountAmount = Math.min(Number(discountValue || 0), eligibleSubtotal);
  } else {
    discountAmount = (eligibleSubtotal * Number(discountValue || 0)) / 100;
  }

  discountAmount = capDiscountAmount(discountAmount, maxDiscountAmount);
  discountAmount = roundAmount(Math.min(discountAmount, eligibleSubtotal));

  return {
    affectedItems: buildProratedAffectedItems(eligibleItems, discountAmount),
    discountAmount,
    eligibleSubtotal,
  };
};

const createPromotionResult = (promotion = {}, result = {}) => ({
  affectedItems: Array.isArray(result.affectedItems) ? result.affectedItems : [],
  discountAmount: roundAmount(result.discountAmount),
  freeItems: Array.isArray(result.freeItems) ? result.freeItems : [],
  message: result.message || '',
  promotionId: promotion.id || promotion._id?.toString?.() || '',
  shippingDiscountAmount: roundAmount(result.shippingDiscountAmount),
  title: promotion.title || '',
  type: promotion.type || '',
});

export {
  aggregateFreeItems,
  applyDiscountByMethod,
  buildProratedAffectedItems,
  createPromotionResult,
  expandItemsToUnits,
  getEligibleItems,
  getItemKey,
  meetsMinOrderAmount,
  sumItemSubtotals,
};

export default {
  aggregateFreeItems,
  applyDiscountByMethod,
  buildProratedAffectedItems,
  createPromotionResult,
  expandItemsToUnits,
  getEligibleItems,
  getItemKey,
  meetsMinOrderAmount,
  sumItemSubtotals,
};
