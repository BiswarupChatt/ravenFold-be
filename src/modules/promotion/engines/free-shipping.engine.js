import {
  createPromotionResult,
  getEligibleItems,
  meetsMinOrderAmount,
} from '@/modules/promotion/engines/promotion-engine.utils.js';
import { roundAmount } from '@/modules/promotion/services/promotion-context.service.js';

const evaluate = async (promotion, context) => {
  const eligibleItems = getEligibleItems(promotion, context);

  if (!eligibleItems.length || !meetsMinOrderAmount(promotion, context)) {
    return null;
  }

  const requiresShipping = eligibleItems.some((item) => item.requiresShipping !== false);
  const shippingDiscountAmount = requiresShipping ? roundAmount(context.shippingCharge) : 0;

  if (shippingDiscountAmount <= 0) {
    return null;
  }

  return createPromotionResult(promotion, {
    affectedItems: [],
    discountAmount: 0,
    message: 'Free shipping applied',
    shippingDiscountAmount,
  });
};

export { evaluate };

export default {
  evaluate,
};
