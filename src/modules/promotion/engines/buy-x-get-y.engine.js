import {
  aggregateFreeItems,
  createPromotionResult,
  expandItemsToUnits,
  getEligibleItems,
  meetsMinOrderAmount,
} from '@/modules/promotion/engines/promotion-engine.utils.js';
import { roundAmount } from '@/modules/promotion/services/promotion-context.service.js';

const evaluate = async (promotion, context) => {
  const eligibleItems = getEligibleItems(promotion, context);

  if (!eligibleItems.length || !meetsMinOrderAmount(promotion, context)) {
    return null;
  }

  const buyQuantity = Number(promotion.buyQuantity || 0);
  const getQuantity = Number(promotion.getQuantity || 0);

  if (buyQuantity <= 0 || getQuantity <= 0) {
    return null;
  }

  const eligibleUnits = expandItemsToUnits(eligibleItems).sort((left, right) => left.unitPrice - right.unitPrice);
  const groupSize = buyQuantity + getQuantity;
  const freeUnitCount = Math.floor(eligibleUnits.length / groupSize) * getQuantity;

  if (freeUnitCount <= 0) {
    return null;
  }

  const freeUnits = eligibleUnits.slice(0, freeUnitCount);
  const freeItems = aggregateFreeItems(freeUnits);
  const discountAmount = roundAmount(freeUnits.reduce((sum, item) => sum + Number(item.unitPrice || 0), 0));
  const affectedItems = freeItems.map((item) => ({
    discountAmount: roundAmount(item.quantity * item.unitPrice),
    productId: item.productId,
    quantity: item.quantity,
    variantId: item.variantId || null,
  }));

  return createPromotionResult(promotion, {
    affectedItems,
    discountAmount,
    freeItems,
    message: `Buy ${buyQuantity} get ${getQuantity} applied`,
    shippingDiscountAmount: 0,
  });
};

export { evaluate };

export default {
  evaluate,
};
