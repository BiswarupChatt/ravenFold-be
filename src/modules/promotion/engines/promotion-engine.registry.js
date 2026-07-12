import { PROMOTION_TYPE } from '@/modules/promotion/constants/promotion.constants.js';
import buyXGetYEngine from '@/modules/promotion/engines/buy-x-get-y.engine.js';
import cartValueEngine from '@/modules/promotion/engines/cart-value.engine.js';
import categoryDiscountEngine from '@/modules/promotion/engines/category-discount.engine.js';
import couponEngine from '@/modules/promotion/engines/coupon.engine.js';
import firstOrderEngine from '@/modules/promotion/engines/first-order.engine.js';
import fixedDiscountEngine from '@/modules/promotion/engines/fixed-discount.engine.js';
import freeShippingEngine from '@/modules/promotion/engines/free-shipping.engine.js';
import newUserEngine from '@/modules/promotion/engines/new-user.engine.js';
import percentageDiscountEngine from '@/modules/promotion/engines/percentage-discount.engine.js';
import productDiscountEngine from '@/modules/promotion/engines/product-discount.engine.js';

const promotionEngineRegistry = {
  [PROMOTION_TYPE.PERCENTAGE_DISCOUNT]: percentageDiscountEngine,
  [PROMOTION_TYPE.FIXED_DISCOUNT]: fixedDiscountEngine,
  [PROMOTION_TYPE.BUY_X_GET_Y]: buyXGetYEngine,
  [PROMOTION_TYPE.FREE_SHIPPING]: freeShippingEngine,
  [PROMOTION_TYPE.CATEGORY_DISCOUNT]: categoryDiscountEngine,
  [PROMOTION_TYPE.PRODUCT_DISCOUNT]: productDiscountEngine,
  [PROMOTION_TYPE.COUPON]: couponEngine,
  [PROMOTION_TYPE.FIRST_ORDER]: firstOrderEngine,
  [PROMOTION_TYPE.NEW_USER]: newUserEngine,
  [PROMOTION_TYPE.CART_VALUE]: cartValueEngine,
};

const getPromotionEngine = (promotionType) => promotionEngineRegistry[promotionType] || null;

export {
  getPromotionEngine,
  promotionEngineRegistry,
};

export default {
  getPromotionEngine,
  promotionEngineRegistry,
};
