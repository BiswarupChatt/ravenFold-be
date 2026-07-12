import percentageDiscountEngine from '@/modules/promotion/engines/percentage-discount.engine.js';

const evaluate = async (promotion, context) => percentageDiscountEngine.evaluate(promotion, context);

export { evaluate };

export default {
  evaluate,
};
