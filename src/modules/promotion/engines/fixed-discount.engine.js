import {
  applyDiscountByMethod,
  createPromotionResult,
  getEligibleItems,
  meetsMinOrderAmount,
} from '@/modules/promotion/engines/promotion-engine.utils.js';
import { PROMOTION_DISCOUNT_METHOD } from '@/modules/promotion/constants/promotion.constants.js';

const evaluate = async (promotion, context) => {
  const eligibleItems = getEligibleItems(promotion, context);

  if (!eligibleItems.length || !meetsMinOrderAmount(promotion, context)) {
    return null;
  }

  const discount = applyDiscountByMethod({
    discountMethod: PROMOTION_DISCOUNT_METHOD.FIXED,
    discountValue: promotion.discountValue,
    eligibleItems,
  });

  if (discount.discountAmount <= 0) {
    return null;
  }

  return createPromotionResult(promotion, {
    affectedItems: discount.affectedItems,
    discountAmount: discount.discountAmount,
    message: `Flat discount of ${discount.discountAmount.toFixed(2)} applied`,
    shippingDiscountAmount: 0,
  });
};

export { evaluate };

export default {
  evaluate,
};
