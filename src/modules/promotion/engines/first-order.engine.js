import percentageDiscountEngine from '@/modules/promotion/engines/percentage-discount.engine.js';

const evaluate = async (promotion, context) => {
  if (!context.userId || Number(context.user?.successfulOrderCount || 0) > 0) {
    return null;
  }

  return percentageDiscountEngine.evaluate(promotion, context);
};

export { evaluate };

export default {
  evaluate,
};
