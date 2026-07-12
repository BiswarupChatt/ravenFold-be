import { PROMOTION_TYPE } from '@/modules/promotion/constants/promotion.constants.js';
import { getItemKey } from '@/modules/promotion/engines/promotion-engine.utils.js';
import { getPromotionEngine } from '@/modules/promotion/engines/promotion-engine.registry.js';
import promotionService from '@/modules/promotion/services/promotion.service.js';
import { normalizePromotionContext, roundAmount } from '@/modules/promotion/services/promotion-context.service.js';

const sortPromotions = (promotions = []) => [...promotions].sort((left, right) => {
  const priorityGap = Number(right.priority || 0) - Number(left.priority || 0);

  if (priorityGap !== 0) {
    return priorityGap;
  }

  if (Boolean(right.isAutomatic) !== Boolean(left.isAutomatic)) {
    return Number(Boolean(right.isAutomatic)) - Number(Boolean(left.isAutomatic));
  }

  return new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime();
});

const getPromotionId = (promotion = {}) => promotion.id || promotion._id?.toString?.() || '';

const getUsageCount = (usageSummary = {}, promotionId, type = 'total') => {
  const sourceMap = type === 'user' ? usageSummary.userByPromotionId : usageSummary.totalByPromotionId;

  if (!(sourceMap instanceof Map)) {
    return 0;
  }

  return Number(sourceMap.get(promotionId) || 0);
};

const getPrecheckFailureReason = ({ context, couponCode, now, promotion, usageSummary }) => {
  const promotionId = getPromotionId(promotion);
  const couponPromotion = promotion.type === PROMOTION_TYPE.COUPON;
  const promotionCouponCode = promotionService.normalizeCouponCode(promotion.couponCode);

  if (!promotion.isActive) {
    return 'Coupon is inactive';
  }

  if (promotion.startDate && new Date(promotion.startDate) > now) {
    return couponPromotion ? 'Coupon is not active yet' : 'Promotion is not active yet';
  }

  if (promotion.endDate && new Date(promotion.endDate) < now) {
    return couponPromotion ? 'Coupon has expired' : 'Promotion has expired';
  }

  if (couponPromotion) {
    if (!couponCode) {
      return 'Coupon code is required';
    }

    if (promotionCouponCode !== couponCode) {
      return 'Invalid coupon code';
    }
  } else if (!promotion.isAutomatic) {
    return 'Manual promotion skipped';
  }

  const totalUsage = Math.max(Number(promotion.usedCount || 0), getUsageCount(usageSummary, promotionId, 'total'));

  if (promotion.usageLimit !== null && promotion.usageLimit !== undefined && totalUsage >= Number(promotion.usageLimit || 0)) {
    return couponPromotion ? 'Coupon usage limit reached' : 'Promotion usage limit reached';
  }

  if (context.userId && promotion.perUserLimit !== null && promotion.perUserLimit !== undefined) {
    const userUsage = getUsageCount(usageSummary, promotionId, 'user');

    if (userUsage >= Number(promotion.perUserLimit || 0)) {
      return couponPromotion ? 'Coupon per-user usage limit reached' : 'Promotion per-user usage limit reached';
    }
  }

  if (!context.userId && [PROMOTION_TYPE.FIRST_ORDER, PROMOTION_TYPE.NEW_USER].includes(promotion.type)) {
    return 'Login required';
  }

  return '';
};

const applyConflictResolution = (evaluatedPromotions = [], context = {}) => {
  const appliedPromotions = [];
  const discountedItemKeys = new Set();
  let shippingPromotionApplied = false;
  let productDiscountAmount = 0;
  let shippingDiscountAmount = 0;

  for (const evaluation of evaluatedPromotions) {
    const { promotion, result } = evaluation;
    const promotionHasProductDiscount = Number(result.discountAmount || 0) > 0;
    const promotionHasShippingDiscount = Number(result.shippingDiscountAmount || 0) > 0;
    const overlapsExistingItemDiscount = (result.affectedItems || []).some((item) => discountedItemKeys.has(getItemKey(item)));
    const existingNonStackable = appliedPromotions.some((appliedPromotion) => appliedPromotion.isStackable === false);

    if (existingNonStackable) {
      continue;
    }

    if (promotion.isStackable === false && appliedPromotions.length > 0) {
      continue;
    }

    if (promotionHasShippingDiscount && shippingPromotionApplied) {
      continue;
    }

    if (promotionHasProductDiscount && overlapsExistingItemDiscount) {
      continue;
    }

    const remainingShipping = roundAmount(Number(context.shippingCharge || 0) - shippingDiscountAmount);
    const boundedShippingDiscount = roundAmount(Math.min(Number(result.shippingDiscountAmount || 0), Math.max(remainingShipping, 0)));

    if (promotionHasShippingDiscount && boundedShippingDiscount <= 0) {
      continue;
    }

    if (promotionHasProductDiscount) {
      for (const item of result.affectedItems || []) {
        discountedItemKeys.add(getItemKey(item));
      }
    }

    productDiscountAmount = roundAmount(productDiscountAmount + Number(result.discountAmount || 0));
    shippingDiscountAmount = roundAmount(shippingDiscountAmount + boundedShippingDiscount);
    shippingPromotionApplied = shippingPromotionApplied || boundedShippingDiscount > 0;
    appliedPromotions.push({
      ...result,
      couponCode: promotion.couponCode || '',
      isAutomatic: Boolean(promotion.isAutomatic),
      isStackable: Boolean(promotion.isStackable),
      priority: Number(promotion.priority || 0),
      shippingDiscountAmount: boundedShippingDiscount,
    });
  }

  const totalDiscountAmount = roundAmount(productDiscountAmount + shippingDiscountAmount);
  const total = roundAmount(
    Math.max(
      Number(context.subtotal || 0) - productDiscountAmount + Number(context.shippingCharge || 0) - shippingDiscountAmount,
      0,
    ),
  );

  return {
    appliedPromotions,
    productDiscountAmount,
    shippingDiscountAmount,
    total,
    totalDiscountAmount,
  };
};

const evaluatePromotions = async ({
  context = {},
  now = new Date(),
  promotions = null,
  usageSummary = null,
} = {}) => {
  const normalizedContext = normalizePromotionContext(context);
  const couponCode = promotionService.normalizeCouponCode(normalizedContext.couponCode);
  const candidatePromotions = sortPromotions(
    Array.isArray(promotions)
      ? promotions
      : await promotionService.listActivePromotions({ now }),
  );
  const effectiveUsageSummary = usageSummary || await promotionService.getPromotionUsageSummary({
    promotionIds: candidatePromotions.map((promotion) => promotion._id).filter(Boolean),
    userId: normalizedContext.userId,
  });
  const evaluatedPromotions = [];
  const matchingCouponPromotions = couponCode
    ? candidatePromotions.filter((promotion) => (
      promotion.type === PROMOTION_TYPE.COUPON
      && promotionService.normalizeCouponCode(promotion.couponCode) === couponCode
    ))
    : [];
  let rejectedCouponReason = couponCode ? 'Invalid coupon code' : '';

  for (const promotion of candidatePromotions) {
    const failureReason = getPrecheckFailureReason({
      context: normalizedContext,
      couponCode,
      now,
      promotion,
      usageSummary: effectiveUsageSummary,
    });

    if (failureReason) {
      if (promotion.type === PROMOTION_TYPE.COUPON && promotionService.normalizeCouponCode(promotion.couponCode) === couponCode) {
        rejectedCouponReason = failureReason;
      }

      continue;
    }

    const engine = getPromotionEngine(promotion.type);

    if (!engine?.evaluate) {
      continue;
    }

    const result = await engine.evaluate(promotion, normalizedContext);

    if (!result) {
      if (promotion.type === PROMOTION_TYPE.COUPON && promotionService.normalizeCouponCode(promotion.couponCode) === couponCode) {
        rejectedCouponReason = 'Coupon is not applicable to this cart';
      }

      continue;
    }

    evaluatedPromotions.push({
      promotion,
      result,
    });
  }

  const resolvedPromotions = applyConflictResolution(evaluatedPromotions, normalizedContext);
  const appliedCoupon = couponCode
    ? resolvedPromotions.appliedPromotions.some((promotion) => promotionService.normalizeCouponCode(promotion.couponCode) === couponCode)
    : false;
  const evaluatedMatchingCoupon = couponCode
    ? evaluatedPromotions.some(({ promotion }) => (
      promotion.type === PROMOTION_TYPE.COUPON
      && promotionService.normalizeCouponCode(promotion.couponCode) === couponCode
    ))
    : false;

  if (couponCode && matchingCouponPromotions.length === 0) {
    rejectedCouponReason = 'Invalid coupon code';
  } else if (
    couponCode
    && !appliedCoupon
    && evaluatedMatchingCoupon
    && (!rejectedCouponReason || rejectedCouponReason === 'Invalid coupon code')
  ) {
    rejectedCouponReason = resolvedPromotions.appliedPromotions.length
      ? 'Coupon cannot be combined with the offers already applied to this cart'
      : 'Coupon is not applicable to this cart';
  }

  return {
    appliedPromotions: resolvedPromotions.appliedPromotions,
    items: normalizedContext.items,
    productDiscountAmount: resolvedPromotions.productDiscountAmount,
    rejectedCoupon: couponCode && !appliedCoupon
      ? {
        code: couponCode,
        reason: rejectedCouponReason || 'Coupon is not applicable to this cart',
      }
      : undefined,
    shippingCharge: normalizedContext.shippingCharge,
    shippingDiscountAmount: resolvedPromotions.shippingDiscountAmount,
    subtotal: normalizedContext.subtotal,
    total: resolvedPromotions.total,
    totalDiscountAmount: resolvedPromotions.totalDiscountAmount,
  };
};

export {
  applyConflictResolution,
  evaluatePromotions,
  getPrecheckFailureReason,
  sortPromotions,
};

export default {
  applyConflictResolution,
  evaluatePromotions,
  getPrecheckFailureReason,
  sortPromotions,
};
