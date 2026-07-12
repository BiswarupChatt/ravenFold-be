import {
  applyDiscountByMethod,
  createPromotionResult,
  getEligibleItems,
  meetsMinOrderAmount,
} from '@/modules/promotion/engines/promotion-engine.utils.js';

const evaluate = async (promotion, context) => {
  const eligibleItems = getEligibleItems(promotion, context);

  if (!eligibleItems.length || !meetsMinOrderAmount(promotion, context)) {
    return null;
  }

  const discount = applyDiscountByMethod({
    discountMethod: promotion.discountMethod,
    discountValue: promotion.discountValue,
    eligibleItems,
    maxDiscountAmount: promotion.maxDiscountAmount,
  });

  if (discount.discountAmount <= 0) {
    return null;
  }

  return createPromotionResult(promotion, {
    affectedItems: discount.affectedItems,
    discountAmount: discount.discountAmount,
    message: 'Cart value promotion applied',
    shippingDiscountAmount: 0,
  });
};

export { evaluate };

export default {
  evaluate,
};
