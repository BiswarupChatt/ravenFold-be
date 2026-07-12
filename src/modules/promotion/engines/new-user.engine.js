import percentageDiscountEngine from '@/modules/promotion/engines/percentage-discount.engine.js';
import { getNewUserEligibilityCutoffDate } from '@/modules/promotion/services/promotion-context.service.js';

const evaluate = async (promotion, context) => {
  if (!context.userId || !context.user?.createdAt) {
    return null;
  }

  const cutoffDate = getNewUserEligibilityCutoffDate(new Date());

  if (context.user.createdAt < cutoffDate) {
    return null;
  }

  return percentageDiscountEngine.evaluate(promotion, context);
};

export { evaluate };

export default {
  evaluate,
};
